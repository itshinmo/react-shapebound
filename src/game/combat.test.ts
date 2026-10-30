import { describe, expect, it } from 'vitest';

import {
  BARRIER_DROP_SEED_OFFSET,
  REFLECTED_BEAM_DURATION_MS,
  createCombatState,
  getReflectionPreviews,
  stepCombat,
  type CombatState,
  type ReflectedBeam,
} from './combat';
import { createBeamLane } from './enemy-orange-triangle';
import { createEnemyWorld, type EnemySlot, type EnemyWorld } from './enemy-world';
import { getShieldSegment } from './reflect-shield';

import type { ViewportRect } from './enemy-spawn';
import type { PlayerState } from './player';

const VIEWPORT: ViewportRect = { left: 0, top: 0, width: 800, height: 600 };
const ARENA_OFFSET = { left: 0, top: 0 };
const SHIELD = getShieldSegment({ x: 400, y: 300 }, 64, { x: 0, y: 1 });
const VERTICAL_LANE = createBeamLane(400, 400, 0, -1, VIEWPORT);

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    x: 400,
    y: 300,
    speed: 0,
    size: 64,
    health: 1,
    barrier: 0,
    maxBarrier: 0,
    alive: true,
    ...overrides,
  };
}

function worldWith(
  entries: readonly (readonly [number, EnemySlot])[],
  overrides: Partial<EnemyWorld> = {},
): EnemyWorld {
  const base = createEnemyWorld(123);
  const slots: (EnemySlot | null)[] = [...base.slots];

  for (const [id, slot] of entries) {
    slots[id] = slot;
  }

  return {
    ...base,
    slots,
    nextRedSpawnAtMs: 100_000,
    nextTriangleSpawnAtMs: 100_000,
    ...overrides,
  };
}

function redSlot(id: number, x: number, y: number, spawnedAtMs = 0): EnemySlot {
  return {
    id,
    kind: 'red-square',
    x,
    y,
    dirX: 0,
    dirY: 0,
    speedPxPerSec: 0,
    sizePx: 32,
    spawnSide: 'left',
    spawnedAtMs,
    enteredViewport: true,
    damagedPlayer: false,
  };
}

function redAtPlayer(id = 0): EnemySlot {
  return redSlot(id, 400, 300);
}

function chargingTriangle(id = 0, x = 400, y = 400): EnemySlot {
  return {
    id,
    kind: 'orange-triangle',
    phase: 'charging',
    x,
    y,
    stopX: x,
    stopY: y,
    aimX: 0,
    aimY: -1,
    approachSpeedPxPerSec: 0,
    exitSpeedPxPerSec: 0,
    spawnedAtMs: 0,
    arrivedAtMs: 500,
    chargeEndsAtMs: 1_000,
    beamEndsAtMs: null,
    lane: VERTICAL_LANE,
    sizePx: 40,
    enteredViewport: true,
    damagedPlayer: false,
  };
}

function stateWith(
  overrides: Partial<CombatState> = {},
  options: { maxCharges?: number; rechargeMs?: number; charges?: number } = {},
): CombatState {
  const base = createCombatState(
    {
      maxReflectCharges: options.maxCharges ?? 0,
      rechargeMs: options.rechargeMs ?? 4_000,
      pierce: 0,
    },
    1,
  );

  return {
    ...base,
    ...(options.charges === undefined
      ? {}
      : { shield: { ...base.shield, charges: options.charges } }),
    ...overrides,
  };
}

function step(input: {
  readonly state?: CombatState;
  readonly player?: PlayerState;
  readonly world?: EnemyWorld;
  readonly phase?: 'idle' | 'armed' | 'spent';
  readonly normal?: { readonly x: number; readonly y: number };
  readonly engaged?: boolean;
  readonly aim?: { readonly x: number; readonly y: number } | null;
  readonly runActive?: boolean;
  readonly stepEndMs?: number;
  readonly pierce?: number;
}) {
  return stepCombat({
    state: input.state ?? stateWith(),
    player: input.player ?? player(),
    world: input.world ?? worldWith([]),
    phase: input.phase ?? 'idle',
    normal: input.normal ?? { x: 0, y: 1 },
    engaged: input.engaged ?? false,
    aim: input.aim ?? null,
    runActive: input.runActive ?? true,
    stepEndMs: input.stepEndMs ?? 1_000,
    viewport: VIEWPORT,
    arenaOffset: ARENA_OFFSET,
    pierce: input.pierce ?? 0,
  });
}

function beam(overrides: Partial<ReflectedBeam> = {}): ReflectedBeam {
  return {
    id: 0,
    originX: 400,
    originY: 300,
    dirX: 1,
    dirY: 0,
    lengthPx: 100,
    spawnedAtMs: 0,
    expiresAtMs: 180,
    ...overrides,
  };
}

describe('createCombatState', () => {
  it('starts with full charges, no beams, and the dedicated drop stream', () => {
    const state = createCombatState({ maxReflectCharges: 3, rechargeMs: 2_500, pierce: 1 }, 123);

    expect(state.shield).toEqual({
      maxCharges: 3,
      charges: 3,
      rechargeMs: 2_500,
      rechargeElapsedMs: 0,
    });
    expect(state.beams).toEqual([]);
    expect(state.nextBeamId).toBe(0);
    expect(state.dropRngState).toBe((123 + BARRIER_DROP_SEED_OFFSET) >>> 0);
  });
});

describe('stepCombat phase and recharge', () => {
  it('does nothing while the run is inactive or the player is dead', () => {
    const state = stateWith({}, { maxCharges: 2, charges: 1 });
    const inactive = step({ state, runActive: false, engaged: true });
    const dead = step({ state, player: player({ alive: false, health: 0 }) });

    expect(inactive.state).toBe(state);
    expect(inactive.phase).toBe('idle');
    expect(inactive.shieldSegment).toBeNull();
    expect(dead.state).toBe(state);
    expect(dead.player.alive).toBe(false);
  });

  it('advances recharge by one active step while armed', () => {
    const state = stateWith({}, { maxCharges: 2, charges: 1, rechargeMs: 4_000 });
    const result = step({ state, phase: 'idle', engaged: true, aim: { x: 0, y: 1 } });

    expect(result.state.shield.rechargeElapsedMs).toBe(20);
    expect(result.phase).toBe('armed');
    expect(result.shieldSegment).not.toBeNull();
  });

  it('arms only on a new press and never re-arms a spent held input', () => {
    const spent = stateWith(
      {
        shield: {
          maxCharges: 1,
          charges: 0,
          rechargeMs: 2_000,
          rechargeElapsedMs: 1_980,
        },
      },
      { maxCharges: 1, rechargeMs: 2_000 },
    );
    const returned = step({ state: spent, phase: 'spent', engaged: true });

    expect(returned.state.shield.charges).toBe(1);
    expect(returned.phase).toBe('spent');
    expect(returned.shieldSegment).toBeNull();

    const stillSpent = step({
      state: returned.state,
      phase: returned.phase,
      engaged: true,
    });

    expect(stillSpent.phase).toBe('spent');

    const released = step({
      state: stillSpent.state,
      phase: stillSpent.phase,
      engaged: false,
    });

    expect(released.phase).toBe('idle');

    const rearmed = step({
      state: released.state,
      phase: released.phase,
      engaged: true,
    });

    expect(rearmed.phase).toBe('armed');
    expect(rearmed.shieldSegment).not.toBeNull();
  });

  it('normalizes an aim and keeps the previous normal for a null or short aim', () => {
    const state = stateWith({}, { maxCharges: 1 });
    const aimed = step({ state, engaged: true, aim: { x: 3, y: 4 } });

    expect(aimed.normal.x).toBeCloseTo(0.6);
    expect(aimed.normal.y).toBeCloseTo(0.8);

    const absent = step({ state: aimed.state, normal: aimed.normal, engaged: true, aim: null });
    const short = step({
      state: absent.state,
      normal: absent.normal,
      engaged: true,
      aim: { x: 0.5, y: 0 },
    });

    expect(short.normal).toEqual(aimed.normal);
  });

  it('does not create a shield or beam at level 0', () => {
    const result = step({ state: stateWith({}, { maxCharges: 0 }), engaged: true });

    expect(result.phase).toBe('spent');
    expect(result.shieldSegment).toBeNull();
    expect(result.state.beams).toEqual([]);
    expect(result.state.shield.charges).toBe(0);
  });
});

describe('instant reflection', () => {
  it('reflects at the exact shield contact and instantly defeats the firing triangle', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 2 }),
      world: worldWith([[0, chargingTriangle()]]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
    });

    expect(result.reflections).toHaveLength(1);
    expect(result.reflections[0]).toMatchObject({
      slotId: 0,
      originX: 400,
      originY: 346,
      contactX: 400,
      contactY: 346,
      dirX: 0,
      dirY: 1,
    });
    expect(result.state.shield.charges).toBe(1);
    expect(result.state.beams).toHaveLength(1);
    expect(result.state.beams[0]).toMatchObject({
      id: 0,
      originX: 400,
      originY: 346,
      dirX: 0,
      dirY: 1,
      spawnedAtMs: 1_000,
      expiresAtMs: 1_000 + REFLECTED_BEAM_DURATION_MS,
    });
    expect(result.state.beams[0]?.lengthPx).toBeGreaterThan(0);
    expect(result.state.nextBeamId).toBe(1);
    expect(result.world.slots[0]).toBeNull();
    expect(result.defeats).toHaveLength(1);
    expect(result.defeats[0]).toMatchObject({
      slotId: 0,
      kind: 'orange-triangle',
      sizePx: 40,
      rotationRad: -Math.PI / 2,
    });
    expect(result.hit).toBeNull();
    expect(result.phase).toBe('armed');
  });

  it('spends the last charge and hides the shield after an instant reflection', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 1 }),
      world: worldWith([[0, chargingTriangle()]]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
    });

    expect(result.state.shield.charges).toBe(0);
    expect(result.phase).toBe('spent');
    expect(result.shieldSegment).toBeNull();
    expect(result.state.beams).toHaveLength(1);

    const held = step({
      state: result.state,
      world: result.world,
      phase: result.phase,
      engaged: true,
      aim: { x: 0, y: 1 },
      stepEndMs: 1_020,
    });

    expect(held.phase).toBe('spent');
    expect(held.shieldSegment).toBeNull();
    expect(held.state.beams).toHaveLength(1);
  });

  it('reflects multiple beams in slot order and creates ordered instant beams', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 2 }),
      world: worldWith([
        [0, chargingTriangle(0)],
        [1, chargingTriangle(1)],
      ]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
    });

    expect(result.reflections.map((reflection) => reflection.slotId)).toEqual([0, 1]);
    expect(result.state.shield.charges).toBe(0);
    expect(result.phase).toBe('spent');
    expect(result.state.beams.map((created) => created.id)).toEqual([0, 1]);
    expect(result.world.slots[0]).toBeNull();
    expect(result.world.slots[1]).toBeNull();
  });

  it('stops an instant beam at its last allowed target', () => {
    const world = worldWith([
      [0, chargingTriangle(0)],
      [1, redSlot(1, 400, 430)],
      [2, redSlot(2, 400, 460)],
    ]);
    const oneTarget = step({
      state: stateWith({}, { maxCharges: 1 }),
      world,
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
      pierce: 0,
    });

    expect(oneTarget.defeats.map((defeat) => defeat.slotId)).toEqual([0]);
    expect(oneTarget.world.slots[1]).not.toBeNull();
    expect(oneTarget.world.slots[2]).not.toBeNull();

    const threeTargets = step({
      state: stateWith({}, { maxCharges: 1 }),
      world,
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
      pierce: 2,
    });

    expect(threeTargets.defeats.map((defeat) => defeat.slotId)).toEqual([0, 1, 2]);
    expect(threeTargets.world.slots[1]).toBeNull();
    expect(threeTargets.world.slots[2]).toBeNull();
    expect(oneTarget.state.beams[0]?.lengthPx).toBeLessThan(
      threeTargets.state.beams[0]?.lengthPx ?? 0,
    );
  });

  it('extends the reflected visual through the last target hitbox', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 1 }),
      world: worldWith([
        [0, chargingTriangle(0)],
        [1, redSlot(1, 400, 430)],
      ]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
      pierce: 1,
    });

    expect(result.defeats.map((defeat) => defeat.slotId)).toEqual([0, 1]);
    expect(result.state.beams[0]?.lengthPx).toBeCloseTo(96.8);
  });

  it('does not let an instant beam hit an enemy beyond the viewport edge', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 1 }),
      world: worldWith([
        [0, chargingTriangle(0)],
        [1, redSlot(1, 400, 620)],
      ]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
      pierce: 1,
    });

    expect(result.defeats.map((defeat) => defeat.slotId)).toEqual([0]);
    expect(result.world.slots[1]).not.toBeNull();
  });

  it('does not let an instant beam hit an enemy spawned in the same step', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 1 }),
      world: worldWith([
        [0, chargingTriangle(0)],
        [1, redSlot(1, 400, 430, 1_000)],
      ]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
      pierce: 1,
    });

    expect(result.defeats.map((defeat) => defeat.slotId)).toEqual([0]);
    expect(result.world.slots[1]).not.toBeNull();
    expect(result.state.beams).toHaveLength(1);
  });

  it('extends the reflected visual to the viewport edge when pierce remains', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 1 }),
      world: worldWith([[0, chargingTriangle(0)]]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
      pierce: 2,
    });

    expect(result.defeats.map((defeat) => defeat.slotId)).toEqual([0]);
    expect(result.state.beams[0]?.lengthPx).toBeGreaterThan(200);
  });

  it('removes a reflected beam visual after its 180 ms lifetime', () => {
    const state = stateWith(
      { beams: [beam({ spawnedAtMs: 0, expiresAtMs: 1_000 })] },
      { maxCharges: 0 },
    );
    const result = step({ state, stepEndMs: 1_000 });

    expect(result.state.beams).toEqual([]);
  });
});

describe('reflection previews', () => {
  it('shows a preview only for a warning lane that would reflect', () => {
    const world = worldWith([[0, chargingTriangle()]]);
    const previews = getReflectionPreviews({
      world,
      shield: SHIELD,
      playerHurtbox: { x: 400, y: 300, halfWidth: 25.6, halfHeight: 25.6 },
      pierce: 0,
      viewport: VIEWPORT,
    });

    expect(previews).toHaveLength(1);
    expect(previews[0]).toMatchObject({
      slotId: 0,
      originX: 400,
      originY: 346,
      dirX: 0,
      dirY: 1,
    });
    expect(previews[0]?.lengthPx).toBeGreaterThan(0);
  });

  it('shows both previews when two warning lanes would reflect', () => {
    const world = worldWith([
      [0, chargingTriangle(0)],
      [1, chargingTriangle(1)],
    ]);
    const previews = getReflectionPreviews({
      world,
      shield: SHIELD,
      playerHurtbox: { x: 400, y: 300, halfWidth: 25.6, halfHeight: 25.6 },
      pierce: 0,
      viewport: VIEWPORT,
    });

    expect(previews.map((preview) => preview.slotId)).toEqual([0, 1]);
  });

  it('follows the pierce budget when drawing the preview path', () => {
    const world = worldWith([
      [0, chargingTriangle(0)],
      [1, redSlot(1, 400, 430)],
      [2, redSlot(2, 400, 460)],
    ]);
    const previewAt = (pierce: number) =>
      getReflectionPreviews({
        world,
        shield: SHIELD,
        playerHurtbox: { x: 400, y: 300, halfWidth: 25.6, halfHeight: 25.6 },
        pierce,
        viewport: VIEWPORT,
      })[0];

    const firstOnly = previewAt(0);
    const threeTargets = previewAt(2);

    expect(firstOnly?.lengthPx).toBeGreaterThan(0);
    expect(threeTargets?.lengthPx).toBeGreaterThan(firstOnly?.lengthPx ?? 0);
  });

  it('extends the preview to the viewport edge when pierce remains after all targets', () => {
    const world = worldWith([[0, chargingTriangle(0)]]);
    const previews = getReflectionPreviews({
      world,
      shield: SHIELD,
      playerHurtbox: { x: 400, y: 300, halfWidth: 25.6, halfHeight: 25.6 },
      pierce: 2,
      viewport: VIEWPORT,
    });

    expect(previews[0]?.lengthPx).toBeGreaterThan(200);
  });

  it('does not preview an inner-side or player-first lane', () => {
    const world = worldWith([[0, chargingTriangle()]]);
    const innerShield = getShieldSegment({ x: 400, y: 300 }, 64, { x: 0, y: -1 });
    const previews = getReflectionPreviews({
      world,
      shield: innerShield,
      playerHurtbox: { x: 400, y: 300, halfWidth: 25.6, halfHeight: 25.6 },
      pierce: 0,
      viewport: VIEWPORT,
    });

    expect(previews).toEqual([]);
  });
});

describe('barrier drops and death order', () => {
  it('applies a successful barrier drop after an instant kill', () => {
    const result = step({
      state: stateWith({ dropRngState: 7 }, { maxCharges: 1 }),
      player: player({ barrier: 0, maxBarrier: 1 }),
      world: worldWith([[0, chargingTriangle()]]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
    });

    expect(result.player.barrier).toBe(1);
    expect(result.defeats[0]).toMatchObject({
      dropSucceeded: true,
      barrierGranted: 1,
    });
    expect(result.state.dropRngState).toBe(1_831_565_820);
  });

  it('does not resolve instant kills when a same-step enemy hit kills the player', () => {
    const result = step({
      state: stateWith({ dropRngState: 7 }, { maxCharges: 1 }),
      player: player({ barrier: 0, maxBarrier: 1 }),
      world: worldWith([
        [0, redAtPlayer(0)],
        [1, chargingTriangle(1)],
      ]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
    });

    expect(result.deathAtMs).toBe(1_000);
    expect(result.player.alive).toBe(false);
    expect(result.defeats).toEqual([]);
    expect(result.world.slots[1]).not.toBeNull();
    expect(result.state.beams).toHaveLength(1);
    expect(result.state.nextBeamId).toBe(1);
  });

  it('resolves body damage before an instant kill when the player survives', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 1 }),
      player: player({ barrier: 1, maxBarrier: 1 }),
      world: worldWith([
        [0, redAtPlayer(0)],
        [1, chargingTriangle(1)],
      ]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
    });

    expect(result.hitAbsorbed).toBe(true);
    expect(result.player.barrier).toBe(0);
    expect(result.defeats.map((defeat) => defeat.slotId)).toEqual([1]);
  });

  it('still applies triangle body damage after reflecting that triangle laser', () => {
    const result = step({
      state: stateWith({}, { maxCharges: 1 }),
      player: player({ barrier: 1, maxBarrier: 1 }),
      world: worldWith([[0, chargingTriangle(0, 400, 300)]]),
      phase: 'idle',
      engaged: true,
      aim: { x: 0, y: 1 },
    });

    expect(result.reflections.map((reflection) => reflection.slotId)).toEqual([0]);
    expect(result.hit?.kind).toBe('orange-triangle');
    expect(result.hitAbsorbed).toBe(true);
    expect(result.player.barrier).toBe(0);
  });
});
