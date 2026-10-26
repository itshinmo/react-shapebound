import { describe, expect, it } from 'vitest';

import { createBeamLane } from './enemy-orange-triangle';
import {
  MAX_CHARGING_TRIANGLES,
  MAX_RED_SQUARES,
  MAX_TRIANGLES,
  POST_HIT_INVULNERABILITY_MS,
  createEnemyWorld,
  getActiveCounts,
  getBeamLanes,
  getChargingCount,
  getFreeSlotCount,
  getWarningLanes,
  stepEnemies,
  type EnemySlot,
  type EnemyStepResult,
  type EnemyWorld,
} from './enemy-world';
import { createRng } from './rng';

import type { TriangleSlot } from './enemy-orange-triangle';
import type { RedSquareSlot } from './enemy-red-square';
import type { SpawnMark, ViewportRect } from './enemy-spawn';

const VIEWPORT: ViewportRect = { left: 0, top: 0, width: 800, height: 600 };
const WIDE_VIEWPORT: ViewportRect = { left: 0, top: 0, width: 2_000, height: 2_000 };
const HURTBOX = { x: 400, y: 300, halfWidth: 25.6, halfHeight: 25.6 };
const WIDE_HURTBOX = { x: 1_000, y: 1_000, halfWidth: 25.6, halfHeight: 25.6 };

function step(
  world: EnemyWorld,
  stepEndMs: number,
  options: {
    readonly viewport?: ViewportRect;
    readonly hurtbox?: {
      readonly x: number;
      readonly y: number;
      readonly halfWidth: number;
      readonly halfHeight: number;
    };
    readonly playerAlive?: boolean;
  } = {},
): EnemyStepResult {
  return stepEnemies(world, {
    stepEndMs,
    viewport: options.viewport ?? VIEWPORT,
    playerHurtbox: options.hurtbox ?? HURTBOX,
    playerAlive: options.playerAlive ?? true,
  });
}

function makeRed(
  id: number,
  overrides: Partial<Omit<RedSquareSlot, 'id' | 'kind'>> = {},
): RedSquareSlot {
  return {
    id,
    kind: 'red-square',
    x: 100,
    y: 100,
    dirX: 1,
    dirY: 0,
    speedPxPerSec: 0,
    sizePx: 32,
    spawnSide: 'left',
    spawnedAtMs: 1_000,
    enteredViewport: true,
    damagedPlayer: false,
    ...overrides,
  };
}

function makeTriangle(
  id: number,
  overrides: Partial<Omit<TriangleSlot, 'id' | 'kind'>> = {},
): TriangleSlot {
  return {
    id,
    kind: 'orange-triangle',
    phase: 'approach',
    x: 100,
    y: 100,
    stopX: 200,
    stopY: 100,
    aimX: 1,
    aimY: 0,
    approachSpeedPxPerSec: 100,
    exitSpeedPxPerSec: 125,
    spawnedAtMs: 1_000,
    arrivedAtMs: null,
    chargeEndsAtMs: null,
    beamEndsAtMs: null,
    lane: null,
    sizePx: 40,
    enteredViewport: true,
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

function requireSlot(world: EnemyWorld, id: number): EnemySlot {
  const slot = world.slots[id];

  if (slot === undefined || slot === null) {
    throw new Error(`Expected slot ${id} to be active.`);
  }

  return slot;
}

function requireRed(world: EnemyWorld, id: number): RedSquareSlot {
  const slot = requireSlot(world, id);

  if (slot.kind !== 'red-square') {
    throw new Error(`Expected slot ${id} to be a red square.`);
  }

  return slot;
}

function requireTriangle(world: EnemyWorld, id: number): TriangleSlot {
  const slot = requireSlot(world, id);

  if (slot.kind !== 'orange-triangle') {
    throw new Error(`Expected slot ${id} to be an orange triangle.`);
  }

  return slot;
}

function requireMark(mark: SpawnMark | null): SpawnMark {
  if (mark === null) {
    throw new Error('Expected a spawn mark.');
  }

  return mark;
}

function beamLane(originX = 200, originY = 300): ReturnType<typeof createBeamLane> {
  return createBeamLane(originX, originY, 1, 0, VIEWPORT);
}

function findRngStateForSide(side: number): number {
  for (let state = 0; state < 100_000; state += 1) {
    const rng = createRng(state);

    if (rng.nextInt(4) === side) {
      return state;
    }
  }

  throw new Error(`Could not find a state for side ${side}.`);
}

function findRngStateForSideAndUnit(side: number, minUnit: number, maxUnit: number): number {
  for (let state = 0; state < 100_000; state += 1) {
    const rng = createRng(state);

    if (rng.nextInt(4) !== side) {
      continue;
    }

    const unit = rng.next();

    if (unit >= minUnit && unit <= maxUnit) {
      return state;
    }
  }

  throw new Error(`Could not find a state for side ${side} and unit ${minUnit}-${maxUnit}.`);
}

describe('createEnemyWorld', () => {
  it('creates exactly 24 free slots with the initial timers and cursors', () => {
    const world = createEnemyWorld(123);

    expect(world.slots).toHaveLength(24);
    expect(world.slots.every((slot) => slot === null)).toBe(true);
    expect(world.nextRedSpawnAtMs).toBe(2_000);
    expect(world.nextTriangleSpawnAtMs).toBe(45_000);
    expect(world.redRngState).toBe((123 + 0x9e3779b9) >>> 0);
    expect(world.triangleRngState).toBe((123 + 0xc2b2ae35) >>> 0);
    expect(world.lastSpawn).toEqual({ red: null, triangle: null });
    expect(world.playerInvulnerableUntilMs).toBe(0);
  });

  it('reports empty counts and derives every count from the slots', () => {
    const world = createEnemyWorld(123);

    expect(getActiveCounts(world)).toEqual({ total: 0, red: 0, triangle: 0 });
    expect(getFreeSlotCount(world)).toBe(24);
    expect(getChargingCount(world)).toBe(0);
    expect(getWarningLanes(world)).toEqual([]);
    expect(getBeamLanes(world)).toEqual([]);
  });
});

describe('spawn unlock and cadence', () => {
  it('attempts the first red at 2 000 ms and skips at the target without drawing', () => {
    const world = createEnemyWorld(5);
    const before = step(world, 1_999);

    expect(getActiveCounts(before.world).red).toBe(0);
    expect(before.world.nextRedSpawnAtMs).toBe(2_000);

    const spawned = step(before.world, 2_000);

    expect(getActiveCounts(spawned.world).red).toBe(1);
    expect(spawned.world.nextRedSpawnAtMs).toBe(2_900);
    expect(getFreeSlotCount(spawned.world)).toBe(23);

    const cursor = spawned.world.redRngState;
    const skipped = step(spawned.world, 2_900);

    expect(getActiveCounts(skipped.world).red).toBe(1);
    expect(skipped.world.nextRedSpawnAtMs).toBe(3_800);
    expect(skipped.world.redRngState).toBe(cursor);
  });

  it('attempts the first triangle at 45 000 ms and then on its cadence', () => {
    const world = createEnemyWorld(7);
    const before = step(world, 44_999, {
      viewport: WIDE_VIEWPORT,
      hurtbox: WIDE_HURTBOX,
    });

    expect(getActiveCounts(before.world).triangle).toBe(0);

    const unlocked = step(before.world, 45_000, {
      viewport: WIDE_VIEWPORT,
      hurtbox: WIDE_HURTBOX,
    });

    expect(getActiveCounts(unlocked.world).triangle).toBe(1);
    expect(unlocked.world.nextTriangleSpawnAtMs).toBe(46_600);

    const triangleCursor = unlocked.world.triangleRngState;
    const cadence = step(unlocked.world, 46_600, {
      viewport: WIDE_VIEWPORT,
      hurtbox: WIDE_HURTBOX,
    });

    expect(cadence.world.nextTriangleSpawnAtMs).toBe(48_200);
    expect(cadence.world.triangleRngState).toBe(triangleCursor);
  });
});

describe('target and pool caps', () => {
  it('skips a red spawn at the per-kind target without drawing or evicting', () => {
    const entries: (readonly [number, EnemySlot])[] = [];

    for (let id = 0; id < MAX_RED_SQUARES; id += 1) {
      entries.push([id, makeRed(id, { spawnedAtMs: 485_000 })]);
    }

    const world = worldWith(entries, {
      nextRedSpawnAtMs: 485_000,
      redRngState: 777,
    });
    const result = step(world, 485_000);

    expect(getActiveCounts(result.world).red).toBe(MAX_RED_SQUARES);
    expect(result.world.nextRedSpawnAtMs).toBe(485_900);
    expect(result.world.redRngState).toBe(777);
  });

  it('skips a triangle spawn at the per-kind target without drawing or evicting', () => {
    const entries: (readonly [number, EnemySlot])[] = [];

    for (let id = 0; id < MAX_TRIANGLES; id += 1) {
      entries.push([
        id,
        makeTriangle(id, {
          phase: 'aimed',
          arrivedAtMs: 405_000,
          lane: beamLane(100 + id * 20, 100),
          spawnedAtMs: 405_000,
        }),
      ]);
    }

    const world = worldWith(entries, {
      nextTriangleSpawnAtMs: 405_000,
      triangleRngState: 777,
    });
    const result = step(world, 405_000);

    expect(getActiveCounts(result.world).triangle).toBe(MAX_TRIANGLES);
    expect(result.world.nextTriangleSpawnAtMs).toBe(406_600);
    expect(result.world.triangleRngState).toBe(777);
  });

  it('skips when the shared pool is full even if the kind target is not reached', () => {
    const entries: (readonly [number, EnemySlot])[] = [];

    for (let id = 0; id < 11; id += 1) {
      entries.push([id, makeRed(id, { spawnedAtMs: 485_000 })]);
    }

    for (let id = 11; id < 24; id += 1) {
      entries.push([
        id,
        makeTriangle(id, {
          phase: 'aimed',
          arrivedAtMs: 1_000,
          lane: beamLane(),
          spawnedAtMs: 485_000,
        }),
      ]);
    }

    const world = worldWith(entries, {
      nextRedSpawnAtMs: 485_000,
      redRngState: 888,
    });
    const result = step(world, 485_000);

    expect(getFreeSlotCount(result.world)).toBe(0);
    expect(getActiveCounts(result.world).total).toBe(24);
    expect(getActiveCounts(result.world).red).toBe(11);
    expect(result.world.redRngState).toBe(888);
    expect(result.world.nextRedSpawnAtMs).toBe(485_900);
  });
});

describe('slot reuse', () => {
  it('reuses the lowest free slot', () => {
    const occupied = makeRed(0, { spawnedAtMs: 85_000 });
    const world = worldWith([[0, occupied]], {
      nextRedSpawnAtMs: 85_000,
      redRngState: 999,
    });
    const result = step(world, 85_000);

    expect(requireRed(result.world, 1).kind).toBe('red-square');
    expect(getActiveCounts(result.world).red).toBe(2);
  });

  it('resets every triangle field when a slot is reused as a red square', () => {
    const triangle = makeTriangle(0, {
      phase: 'exiting',
      spawnedAtMs: 0,
      enteredViewport: false,
      beamEndsAtMs: 999_999,
      exitSpeedPxPerSec: 0,
    });
    const world = worldWith([[0, triangle]], {
      nextRedSpawnAtMs: 30_000,
      redRngState: 1_234,
    });
    const result = step(world, 30_000);
    const reused = requireRed(result.world, 0);

    expect(reused.kind).toBe('red-square');
    expect(reused.damagedPlayer).toBe(false);
    expect(reused.enteredViewport).toBe(false);
    expect(reused).not.toHaveProperty('phase');
    expect(reused).not.toHaveProperty('lane');
    expect(reused).not.toHaveProperty('chargeEndsAtMs');
    expect(reused).not.toHaveProperty('arrivedAtMs');
  });
});

describe('RNG streams', () => {
  it('replays the same seed and inputs to the same world', () => {
    const first = runSequence(99);
    const second = runSequence(99);

    expect(first).toEqual(second);
  });

  it('keeps the red and triangle cursors independent', () => {
    const base = createEnemyWorld(99);
    const triangleSeed = base.triangleRngState;
    const redSeed = base.redRngState;
    const afterRed = step(base, 2_000, {
      viewport: WIDE_VIEWPORT,
      hurtbox: WIDE_HURTBOX,
    });

    expect(afterRed.world.redRngState).not.toBe(redSeed);
    expect(afterRed.world.triangleRngState).toBe(triangleSeed);

    const withoutRedAttempt = { ...afterRed.world, nextRedSpawnAtMs: 100_000 };
    const afterTriangle = step(withoutRedAttempt, 45_000, {
      viewport: WIDE_VIEWPORT,
      hurtbox: WIDE_HURTBOX,
    });

    expect(afterTriangle.world.triangleRngState).not.toBe(triangleSeed);
    expect(afterTriangle.world.redRngState).toBe(afterRed.world.redRngState);
  });
});

describe('same-kind spawn spacing', () => {
  it('shifts a same-side red spawn within the spacing window', () => {
    const state = findRngStateForSide(0);
    const world = worldWith([], {
      nextRedSpawnAtMs: 2_000,
      redRngState: state,
      lastSpawn: {
        red: { side: 'top', alongPx: 400, atMs: 0 },
        triangle: null,
      },
    });
    const result = step(world, 2_000);
    const red = requireRed(result.world, 0);
    const mark = requireMark(result.world.lastSpawn.red);

    expect(red.spawnSide).toBe('top');
    expect(mark.side).toBe('top');
    expect(Math.abs(mark.alongPx - 400)).toBeGreaterThanOrEqual(128);
  });
});

describe('damage resolution', () => {
  it('accepts a swept red contact and applies post-hit invulnerability', () => {
    const red = makeRed(3, {
      x: 360,
      y: 300,
      speedPxPerSec: 100,
      spawnedAtMs: 1_000,
    });
    const triangle = makeTriangle(1, {
      phase: 'charging',
      x: 200,
      y: 300,
      stopX: 200,
      stopY: 300,
      arrivedAtMs: 500,
      chargeEndsAtMs: 1_000,
      lane: beamLane(),
      spawnedAtMs: 500,
    });
    const world = worldWith([
      [1, triangle],
      [3, red],
    ]);
    const result = step(world, 1_000);

    expect(result.hit).toEqual({ slotId: 3, kind: 'red-square', atMs: 1_000 });
    expect(requireRed(result.world, 3).damagedPlayer).toBe(true);
    expect(requireTriangle(result.world, 1).phase).toBe('firing');
    expect(result.world.playerInvulnerableUntilMs).toBe(1_000 + POST_HIT_INVULNERABILITY_MS);

    const invulnerableStep = step(result.world, 1_020);
    const afterWindow = step(result.world, 1_500);

    expect(invulnerableStep.hit).toBeNull();
    expect(afterWindow.hit).toBeNull();
  });

  it('chooses the earliest red contact and leaves the loser unmarked', () => {
    const early = makeRed(1, {
      x: 360.5,
      y: 300,
      speedPxPerSec: 100,
      spawnedAtMs: 1_000,
    });
    const late = makeRed(3, {
      x: 360,
      y: 300,
      speedPxPerSec: 100,
      spawnedAtMs: 1_000,
    });
    const world = worldWith([
      [1, early],
      [3, late],
    ]);
    const result = step(world, 1_000);

    expect(result.hit).toEqual({ slotId: 1, kind: 'red-square', atMs: 1_000 });
    expect(requireRed(result.world, 1).damagedPlayer).toBe(true);
    expect(requireRed(result.world, 3).damagedPlayer).toBe(false);
  });

  it('ignores a red contact while invulnerable and accepts it after the window', () => {
    const red = makeRed(1, { x: 400, y: 300, spawnedAtMs: 1_000 });
    const world = worldWith([[1, red]], { playerInvulnerableUntilMs: 1_500 });
    const before = step(world, 1_499);

    expect(before.hit).toBeNull();
    expect(requireRed(before.world, 1).damagedPlayer).toBe(false);

    const after = step(world, 1_500);

    expect(after.hit).toEqual({ slotId: 1, kind: 'red-square', atMs: 1_500 });
    expect(requireRed(after.world, 1).damagedPlayer).toBe(true);
  });

  it('fires a triangle laser once and keeps only one beam for its linger', () => {
    const triangle = makeTriangle(1, {
      phase: 'charging',
      x: 200,
      y: 300,
      stopX: 200,
      stopY: 300,
      arrivedAtMs: 500,
      chargeEndsAtMs: 1_000,
      lane: beamLane(),
      spawnedAtMs: 500,
    });
    const world = worldWith([[1, triangle]]);
    const fired = step(world, 1_000);

    expect(fired.hit).toEqual({ slotId: 1, kind: 'orange-triangle', atMs: 1_000 });
    expect(requireTriangle(fired.world, 1).phase).toBe('firing');
    expect(requireTriangle(fired.world, 1).beamEndsAtMs).toBe(1_180);
    expect(getBeamLanes(fired.world)).toHaveLength(1);

    const during = step(fired.world, 1_020);
    const ended = step(fired.world, 1_180);

    expect(during.hit).toBeNull();
    expect(requireTriangle(during.world, 1).phase).toBe('firing');
    expect(ended.hit).toBeNull();
    expect(requireTriangle(ended.world, 1).phase).toBe('exiting');
    expect(getBeamLanes(ended.world)).toHaveLength(0);
  });

  it('consumes a triangle shot while the player is invulnerable', () => {
    const triangle = makeTriangle(1, {
      phase: 'charging',
      x: 200,
      y: 300,
      stopX: 200,
      stopY: 300,
      arrivedAtMs: 500,
      chargeEndsAtMs: 1_000,
      lane: beamLane(),
      spawnedAtMs: 500,
    });
    const world = worldWith([[1, triangle]], { playerInvulnerableUntilMs: 2_000 });
    const result = step(world, 1_000);

    expect(result.hit).toBeNull();
    expect(requireTriangle(result.world, 1).phase).toBe('firing');
    expect(requireTriangle(result.world, 1).beamEndsAtMs).toBe(1_180);
  });

  it('never damages from triangle body contact', () => {
    const triangle = makeTriangle(2, {
      phase: 'approach',
      x: 400,
      y: 300,
      stopX: 700,
      stopY: 300,
      aimX: 1,
      aimY: 0,
      approachSpeedPxPerSec: 100,
      spawnedAtMs: 1_000,
    });
    const world = worldWith([[2, triangle]]);
    const result = step(world, 1_000);

    expect(result.hit).toBeNull();
    expect(requireTriangle(result.world, 2).x).toBeCloseTo(402);
  });
});

describe('warning lanes', () => {
  it('reports only charging lanes as warnings and only firing lanes as beams', () => {
    const firstWarning = beamLane(100, 100);
    const secondWarning = beamLane(150, 100);
    const beam = beamLane(250, 100);
    const aimedLane = beamLane(300, 100);
    const world = worldWith([
      [0, makeTriangle(0, { phase: 'charging', lane: firstWarning, chargeEndsAtMs: 9_000 })],
      [1, makeTriangle(1, { phase: 'firing', lane: beam, beamEndsAtMs: 9_000 })],
      [2, makeTriangle(2, { phase: 'aimed', lane: aimedLane, arrivedAtMs: 1_000 })],
      [3, makeTriangle(3, { phase: 'charging', lane: secondWarning, chargeEndsAtMs: 9_000 })],
    ]);

    expect(getWarningLanes(world)).toEqual([firstWarning, secondWarning]);
    expect(getBeamLanes(world)).toEqual([beam]);
    expect(getChargingCount(world)).toBe(2);
  });

  it('promotes at most two charging triangles in arrival order', () => {
    const lane = beamLane();
    const firing = makeTriangle(0, {
      phase: 'charging',
      arrivedAtMs: 500,
      chargeEndsAtMs: 1_000,
      lane,
    });
    const firstWaiter = makeTriangle(1, { phase: 'aimed', arrivedAtMs: 600, lane });
    const secondWaiter = makeTriangle(2, { phase: 'aimed', arrivedAtMs: 700, lane });
    const thirdWaiter = makeTriangle(3, { phase: 'aimed', arrivedAtMs: 800, lane });
    const world = worldWith([
      [0, firing],
      [1, firstWaiter],
      [2, secondWaiter],
      [3, thirdWaiter],
    ]);
    const firstStep = step(world, 1_000);
    const secondStep = step(firstStep.world, 1_020);

    expect(requireTriangle(firstStep.world, 0).phase).toBe('firing');
    expect(requireTriangle(firstStep.world, 1).phase).toBe('charging');
    expect(requireTriangle(firstStep.world, 2).phase).toBe('aimed');
    expect(requireTriangle(firstStep.world, 3).phase).toBe('aimed');
    expect(getChargingCount(firstStep.world)).toBe(1);
    expect(requireTriangle(secondStep.world, 2).phase).toBe('charging');
    expect(requireTriangle(secondStep.world, 3).phase).toBe('aimed');
    expect(getChargingCount(secondStep.world)).toBe(MAX_CHARGING_TRIANGLES);
  });

  it('does not let a new arrival take a warning slot freed by a same-step fire', () => {
    const lane = beamLane(100, 100);
    const firstCharging = makeTriangle(0, {
      phase: 'charging',
      x: 100,
      y: 100,
      stopX: 100,
      stopY: 100,
      arrivedAtMs: 500,
      chargeEndsAtMs: 1_000,
      lane,
      spawnedAtMs: 500,
    });
    const secondCharging = makeTriangle(1, {
      phase: 'charging',
      x: 120,
      y: 100,
      stopX: 120,
      stopY: 100,
      arrivedAtMs: 550,
      chargeEndsAtMs: 1_000,
      lane,
      spawnedAtMs: 500,
    });
    const arriving = makeTriangle(2, {
      phase: 'approach',
      x: 299,
      y: 100,
      stopX: 300,
      stopY: 100,
      aimX: 1,
      aimY: 0,
      approachSpeedPxPerSec: 100,
      spawnedAtMs: 500,
    });
    const world = worldWith([
      [0, firstCharging],
      [1, secondCharging],
      [2, arriving],
    ]);

    const firstStep = step(world, 1_000);
    const secondStep = step(firstStep.world, 1_020);

    expect(requireTriangle(firstStep.world, 2).phase).toBe('aimed');
    expect(requireTriangle(firstStep.world, 2).arrivedAtMs).toBe(1_000);
    expect(getChargingCount(firstStep.world)).toBe(0);
    expect(requireTriangle(secondStep.world, 2).phase).toBe('charging');
  });
});

describe('freeze and death no-op', () => {
  it('returns the same world when the player is not alive', () => {
    const red = makeRed(0, { x: 100, y: 100, spawnedAtMs: 1_000 });
    const world = worldWith([[0, red]], { nextRedSpawnAtMs: 1_000 });
    const result = step(world, 1_000, { playerAlive: false });

    expect(result.world).toBe(world);
    expect(result.hit).toBeNull();
    expect(result.world.slots[0]).toBe(red);
  });

  it('returns the same world for a non-finite or negative step time', () => {
    const world = createEnemyWorld(5);

    expect(step(world, Number.NaN).world).toBe(world);
    expect(step(world, Number.POSITIVE_INFINITY).world).toBe(world);
    expect(step(world, -20).world).toBe(world);
  });

  it('does not despawn active enemies when the run stops', () => {
    const red = makeRed(0, { x: 100, y: 100, spawnedAtMs: 1_000 });
    const world = worldWith([[0, red]], { nextRedSpawnAtMs: 1_000 });
    const firstStop = step(world, 1_000, { playerAlive: false });
    const secondStop = step(firstStop.world, 1_020, { playerAlive: false });

    expect(secondStop.world).toBe(world);
    expect(secondStop.world.slots[0]).toBe(red);
  });

  it('creates a fresh empty world for Retry', () => {
    const world = createEnemyWorld(5);
    const retry = createEnemyWorld(6);

    expect(retry).not.toBe(world);
    expect(retry.slots.every((slot) => slot === null)).toBe(true);
    expect(retry.nextRedSpawnAtMs).toBe(2_000);
    expect(retry.nextTriangleSpawnAtMs).toBe(45_000);
  });
});

describe('resize handling', () => {
  it('pre-culls an entered enemy that is outside the inflated new viewport', () => {
    const red = makeRed(0, { x: 500, y: 100, spawnedAtMs: 1_000 });
    const world = worldWith([[0, red]]);
    const result = step(world, 1_000, {
      viewport: { left: 0, top: 0, width: 300, height: 200 },
    });

    expect(result.world.slots[0]).toBeNull();
    expect(result.hit).toBeNull();
  });

  it('keeps active positions absolute and only moves them by the fixed step', () => {
    const red = makeRed(0, {
      x: 100,
      y: 100,
      speedPxPerSec: 100,
      spawnedAtMs: 1_000,
    });
    const world = worldWith([[0, red]]);
    const result = step(world, 1_000, {
      viewport: { left: 0, top: 0, width: 300, height: 200 },
    });

    expect(requireRed(result.world, 0).x).toBeCloseTo(102);
    expect(requireRed(result.world, 0).y).toBe(100);
  });

  it('keeps stepping active enemies when the viewport is degenerate', () => {
    const red = makeRed(0, {
      x: 100,
      y: 100,
      speedPxPerSec: 100,
      spawnedAtMs: 1_000,
    });
    const world = worldWith([[0, red]]);
    const result = step(world, 1_000, {
      viewport: { left: 0, top: 0, width: 100, height: 600 },
    });

    expect(requireRed(result.world, 0).x).toBeCloseTo(102);
  });

  it('pre-culls an off-screen charging triangle before it can fire', () => {
    const triangle = makeTriangle(0, {
      phase: 'charging',
      x: 700,
      y: 300,
      stopX: 700,
      stopY: 300,
      arrivedAtMs: 500,
      chargeEndsAtMs: 1_000,
      lane: beamLane(),
      spawnedAtMs: 500,
    });
    const world = worldWith([[0, triangle]]);
    const result = step(world, 1_000, {
      viewport: { left: 0, top: 0, width: 300, height: 200 },
    });

    expect(result.world.slots[0]).toBeNull();
    expect(result.hit).toBeNull();
  });

  it('consumes triangle draws without a slot when no stop candidate is valid', () => {
    const state = findRngStateForSideAndUnit(0, 0.4, 0.6);
    const world = {
      ...createEnemyWorld(5),
      nextRedSpawnAtMs: 100_000,
      nextTriangleSpawnAtMs: 45_000,
      triangleRngState: state,
    };
    const result = step(world, 45_000, {
      viewport: { left: 0, top: 0, width: 800, height: 129 },
      hurtbox: { x: 400, y: 60, halfWidth: 25.6, halfHeight: 25.6 },
    });

    expect(getActiveCounts(result.world).triangle).toBe(0);
    expect(result.world.nextTriangleSpawnAtMs).toBe(46_600);
    expect(result.world.triangleRngState).not.toBe(state);
    expect(result.world.lastSpawn.triangle).toBeNull();
  });

  it('aborts spawns while keeping clock-driven timers and cursors advancing', () => {
    const world = createEnemyWorld(5);
    const result = step(world, 2_000, {
      viewport: { left: 0, top: 0, width: 100, height: 600 },
    });

    expect(getActiveCounts(result.world).total).toBe(0);
    expect(result.world.nextRedSpawnAtMs).toBe(2_900);
    expect(result.world.redRngState).toBe(world.redRngState);
  });
});

describe('pool bounds', () => {
  it('holds the 24-slot, per-kind, warning, and beam bounds across a long run', () => {
    let world = createEnemyWorld(123);

    for (let stepEndMs = 20; stepEndMs <= 500_000; stepEndMs += 20) {
      world = step(world, stepEndMs).world;
    }

    const counts = getActiveCounts(world);

    expect(world.slots).toHaveLength(24);
    expect(counts.total).toBeLessThanOrEqual(24);
    expect(counts.red).toBeLessThanOrEqual(MAX_RED_SQUARES);
    expect(counts.triangle).toBeLessThanOrEqual(MAX_TRIANGLES);
    expect(getChargingCount(world)).toBeLessThanOrEqual(MAX_CHARGING_TRIANGLES);
    expect(getWarningLanes(world).length).toBeLessThanOrEqual(2);
    expect(getBeamLanes(world).length).toBeLessThanOrEqual(2);
    expect(getFreeSlotCount(world) + counts.total).toBe(24);
  });
});

function runSequence(seed: number): EnemyWorld {
  let world = createEnemyWorld(seed);

  world = step(world, 2_000, {
    viewport: WIDE_VIEWPORT,
    hurtbox: WIDE_HURTBOX,
  }).world;
  world = step(world, 44_999, {
    viewport: WIDE_VIEWPORT,
    hurtbox: WIDE_HURTBOX,
  }).world;
  world = step(world, 45_000, {
    viewport: WIDE_VIEWPORT,
    hurtbox: WIDE_HURTBOX,
  }).world;

  return world;
}
