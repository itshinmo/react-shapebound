import {
  getEnemyHitHalf,
  getLaneAabbContact,
  resolveLaneReflection,
  type BeamLane,
  type Hurtbox,
} from './enemy-collision';
import { ENEMY_STEP_MS } from './enemy-spawn';
import {
  stepEnemies,
  type EnemyFire,
  type EnemyKind,
  type EnemyReflection,
  type EnemyWorld,
  type HitIntent,
} from './enemy-world';
import { addBarrier, applyDamage, type PlayerState } from './player';
import {
  advanceReflectShield,
  createReflectShieldState,
  getShieldSegment,
  spendReflectCharge,
  type ReflectInputPhase,
  type ReflectShieldState,
  type ShieldNormal,
  type ShieldPoint,
  type ShieldSegment,
} from './reflect-shield';
import { createRng } from './rng';

import type { ViewportRect } from './enemy-spawn';

export const REFLECTED_BEAM_WIDTH_PX = 12;
export const REFLECTED_BEAM_DURATION_MS = 180;
export const REFLECTED_BEAM_POOL_SIZE = 6;
export const REFLECTION_PREVIEW_POOL_SIZE = 6;
export const EXPLOSION_POOL_SIZE = 12;
export const EXPLOSION_DURATION_MS = 450;
export const EXPLOSION_END_SIZE_PX = 48;
export const BARRIER_DROP_CHANCE = 0.05;
export const BARRIER_DROP_SEED_OFFSET = 0x85ebca6b;
export const PLAYER_HURTBOX_HALF_FACTOR = 0.4;

export interface CombatLoadout {
  readonly maxReflectCharges: number;
  readonly rechargeMs: number;
  readonly pierce: number;
}

export interface ArenaOffset {
  readonly left: number;
  readonly top: number;
}

export interface ReflectedBeam {
  readonly id: number;
  readonly originX: number;
  readonly originY: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly lengthPx: number;
  readonly spawnedAtMs: number;
  readonly expiresAtMs: number;
}

export interface ReflectionPreview {
  readonly slotId: number;
  readonly originX: number;
  readonly originY: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly lengthPx: number;
}

export interface EnemyDefeated {
  readonly slotId: number;
  readonly kind: EnemyKind;
  readonly x: number;
  readonly y: number;
  readonly sizePx: number;
  readonly rotationRad: number;
  readonly atMs: number;
  readonly dropRoll: number;
  readonly dropSucceeded: boolean;
  readonly barrierGranted: number;
}

export interface CombatState {
  readonly shield: ReflectShieldState;
  readonly beams: readonly ReflectedBeam[];
  readonly nextBeamId: number;
  readonly dropRngState: number;
}

export interface CombatStepInput {
  readonly state: CombatState;
  readonly player: PlayerState;
  readonly world: EnemyWorld;
  readonly phase: ReflectInputPhase;
  readonly normal: ShieldNormal;
  readonly engaged: boolean;
  readonly aim: ShieldPoint | null;
  readonly runActive: boolean;
  readonly stepEndMs: number;
  readonly viewport: ViewportRect;
  readonly arenaOffset: ArenaOffset;
  readonly pierce: number;
}

export interface CombatStepResult {
  readonly state: CombatState;
  readonly player: PlayerState;
  readonly world: EnemyWorld;
  readonly phase: ReflectInputPhase;
  readonly normal: ShieldNormal;
  readonly shieldSegment: ShieldSegment | null;
  readonly fires: readonly EnemyFire[];
  readonly reflectedFireSlotIds: readonly number[];
  readonly reflections: readonly EnemyReflection[];
  readonly hit: HitIntent | null;
  readonly hitAbsorbed: boolean;
  readonly defeats: readonly EnemyDefeated[];
  readonly deathAtMs: number | null;
}

export interface ReflectionPreviewInput {
  readonly world: EnemyWorld;
  readonly shield: ShieldSegment;
  readonly playerHurtbox: Hurtbox;
  readonly pierce: number;
  readonly viewport: ViewportRect;
}

interface ReflectedTarget {
  readonly slotId: number;
  readonly distancePx: number;
  readonly exitPx: number;
}

interface ReflectedResolution {
  readonly slots: EnemyWorld['slots'][number][];
  readonly player: PlayerState;
  readonly defeats: EnemyDefeated[];
  readonly lengthPx: number;
}

export function createCombatState(loadout: CombatLoadout, seed: number): CombatState {
  return {
    shield: createReflectShieldState(loadout.maxReflectCharges, loadout.rechargeMs),
    beams: [],
    nextBeamId: 0,
    dropRngState: (seed + BARRIER_DROP_SEED_OFFSET) >>> 0,
  };
}

export function stepCombat(input: CombatStepInput): CombatStepResult {
  if (!input.runActive || !input.player.alive) {
    return {
      state: input.state,
      player: input.player,
      world: input.world,
      phase: 'idle',
      normal: input.normal,
      shieldSegment: null,
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
      hit: null,
      hitAbsorbed: false,
      defeats: [],
      deathAtMs: null,
    };
  }

  let shield = advanceReflectShield(input.state.shield, ENEMY_STEP_MS);
  let phase = resolvePhase(input.phase, input.engaged, shield);
  const normal = resolveNormal(input.normal, input.aim);
  const playerCenter = {
    x: input.arenaOffset.left + input.player.x,
    y: input.arenaOffset.top + input.player.y,
  };
  const playerHurtbox: Hurtbox = {
    x: playerCenter.x,
    y: playerCenter.y,
    halfWidth: input.player.size * PLAYER_HURTBOX_HALF_FACTOR,
    halfHeight: input.player.size * PLAYER_HURTBOX_HALF_FACTOR,
  };
  const segment =
    phase === 'armed' && shield.charges > 0
      ? getShieldSegment(playerCenter, input.player.size, normal)
      : null;
  const enemyResult = stepEnemies(input.world, {
    stepEndMs: input.stepEndMs,
    viewport: input.viewport,
    playerHurtbox,
    playerAlive: input.player.alive,
    shield:
      segment === null
        ? null
        : {
            segment,
            chargesAvailable: shield.charges,
          },
  });

  shield = enemyResult.reflections.reduce((current) => spendReflectCharge(current), shield);

  if (phase === 'armed' && shield.charges === 0) {
    phase = 'spent';
  }

  let player = enemyResult.hit === null ? input.player : applyDamage(input.player, 1);
  const hitAbsorbed = enemyResult.hit !== null && player.alive;

  if (!player.alive) {
    const beams = input.state.beams.filter((beam) => beam.expiresAtMs > input.stepEndMs);
    let nextBeamId = input.state.nextBeamId;

    for (const reflection of enemyResult.reflections) {
      const lane = createReflectedLane(
        { x: reflection.originX, y: reflection.originY },
        { x: reflection.dirX, y: reflection.dirY },
        input.viewport,
      );
      const targets = getReflectedTargets(lane, enemyResult.world.slots, input.stepEndMs);
      const lengthPx = getReflectedVisualLength({
        originX: reflection.originX,
        originY: reflection.originY,
        dirX: reflection.dirX,
        dirY: reflection.dirY,
        viewport: input.viewport,
        targets,
        slots: enemyResult.world.slots,
        pierce: input.pierce,
      });

      beams.push({
        id: nextBeamId,
        originX: reflection.originX,
        originY: reflection.originY,
        dirX: reflection.dirX,
        dirY: reflection.dirY,
        lengthPx,
        spawnedAtMs: input.stepEndMs,
        expiresAtMs: input.stepEndMs + REFLECTED_BEAM_DURATION_MS,
      });
      nextBeamId += 1;
    }

    return {
      state: {
        shield,
        beams,
        nextBeamId,
        dropRngState: input.state.dropRngState,
      },
      player,
      world: enemyResult.world,
      phase: 'idle',
      normal,
      shieldSegment: null,
      fires: enemyResult.fires,
      reflectedFireSlotIds: enemyResult.reflectedFireSlotIds,
      reflections: enemyResult.reflections,
      hit: enemyResult.hit,
      hitAbsorbed: false,
      defeats: [],
      deathAtMs: input.stepEndMs,
    };
  }

  let slots: EnemyWorld['slots'][number][] = [...enemyResult.world.slots];
  const dropRng = createRng(input.state.dropRngState);
  const defeats: EnemyDefeated[] = [];
  const beams = input.state.beams.filter((beam) => beam.expiresAtMs > input.stepEndMs);
  let nextBeamId = input.state.nextBeamId;

  for (const reflection of enemyResult.reflections) {
    const resolution = resolveReflectedBeam({
      reflection,
      slots,
      player,
      pierce: input.pierce,
      viewport: input.viewport,
      stepEndMs: input.stepEndMs,
      dropRng,
    });

    slots = resolution.slots;
    player = resolution.player;
    defeats.push(...resolution.defeats);
    beams.push({
      id: nextBeamId,
      originX: reflection.originX,
      originY: reflection.originY,
      dirX: reflection.dirX,
      dirY: reflection.dirY,
      lengthPx: resolution.lengthPx,
      spawnedAtMs: input.stepEndMs,
      expiresAtMs: input.stepEndMs + REFLECTED_BEAM_DURATION_MS,
    });
    nextBeamId += 1;
  }

  const world = defeats.length === 0 ? enemyResult.world : { ...enemyResult.world, slots };
  const finalSegment = phase === 'armed' && shield.charges > 0 && player.alive ? segment : null;

  return {
    state: {
      shield,
      beams,
      nextBeamId,
      dropRngState: dropRng.getState(),
    },
    player,
    world,
    phase,
    normal,
    shieldSegment: finalSegment,
    fires: enemyResult.fires,
    reflectedFireSlotIds: enemyResult.reflectedFireSlotIds,
    reflections: enemyResult.reflections,
    hit: enemyResult.hit,
    hitAbsorbed,
    defeats,
    deathAtMs: null,
  };
}

export function getReflectionPreviews(input: ReflectionPreviewInput): readonly ReflectionPreview[] {
  const previews: ReflectionPreview[] = [];

  for (const slot of input.world.slots) {
    if (slot?.kind !== 'orange-triangle' || slot.phase !== 'charging' || slot.lane === null) {
      continue;
    }

    const reflection = resolveLaneReflection(slot.lane, input.shield, input.playerHurtbox);

    if (reflection === null) {
      continue;
    }

    const direction = { x: reflection.dirX, y: reflection.dirY };
    const lane = createReflectedLane(
      { x: reflection.originX, y: reflection.originY },
      direction,
      input.viewport,
    );
    const targets = getReflectedTargets(lane, input.world.slots, null);
    const lengthPx = getReflectedVisualLength({
      originX: reflection.originX,
      originY: reflection.originY,
      dirX: direction.x,
      dirY: direction.y,
      viewport: input.viewport,
      targets,
      slots: input.world.slots,
      pierce: input.pierce,
    });

    previews.push({
      slotId: slot.id,
      originX: reflection.originX,
      originY: reflection.originY,
      dirX: direction.x,
      dirY: direction.y,
      lengthPx,
    });

    if (previews.length === REFLECTION_PREVIEW_POOL_SIZE) {
      break;
    }
  }

  return previews;
}

function resolveReflectedBeam(input: {
  readonly reflection: EnemyReflection;
  readonly slots: EnemyWorld['slots'][number][];
  readonly player: PlayerState;
  readonly pierce: number;
  readonly viewport: ViewportRect;
  readonly stepEndMs: number;
  readonly dropRng: ReturnType<typeof createRng>;
}): ReflectedResolution {
  const lane = createReflectedLane(
    { x: input.reflection.originX, y: input.reflection.originY },
    { x: input.reflection.dirX, y: input.reflection.dirY },
    input.viewport,
  );
  const targets = getReflectedTargets(lane, input.slots, input.stepEndMs);
  const allowed = targets.slice(0, 1 + normalizePierce(input.pierce));
  const slots = [...input.slots];
  let player = input.player;
  const defeats: EnemyDefeated[] = [];
  const lengthPx = getReflectedVisualLength({
    originX: input.reflection.originX,
    originY: input.reflection.originY,
    dirX: input.reflection.dirX,
    dirY: input.reflection.dirY,
    viewport: input.viewport,
    targets,
    slots: input.slots,
    pierce: input.pierce,
  });

  for (const target of allowed) {
    const slot = slots[target.slotId];

    if (slot === undefined || slot === null) {
      continue;
    }

    const dropRoll = input.dropRng.next();
    const dropSucceeded = dropRoll < BARRIER_DROP_CHANCE;
    const nextPlayer = dropSucceeded ? addBarrier(player, 1) : player;
    const barrierGranted = nextPlayer.barrier - player.barrier;

    player = nextPlayer;
    slots[target.slotId] = null;
    defeats.push({
      slotId: target.slotId,
      kind: slot.kind,
      x: slot.x,
      y: slot.y,
      sizePx: slot.sizePx,
      rotationRad: slot.kind === 'orange-triangle' ? Math.atan2(slot.aimY, slot.aimX) : 0,
      atMs: input.stepEndMs,
      dropRoll,
      dropSucceeded,
      barrierGranted,
    });
  }

  return { slots, player, defeats, lengthPx };
}

function getReflectedTargets(
  lane: BeamLane,
  slots: EnemyWorld['slots'],
  excludeSpawnedAtMs: number | null,
): ReflectedTarget[] {
  const targets: ReflectedTarget[] = [];

  for (let slotId = 0; slotId < slots.length; slotId += 1) {
    const slot = slots[slotId];

    if (slot === undefined || slot === null) {
      continue;
    }

    if (excludeSpawnedAtMs !== null && slot.spawnedAtMs === excludeSpawnedAtMs) {
      continue;
    }

    const half = getEnemyHitHalf(slot.sizePx);
    const contact = getLaneAabbContact(lane, {
      x: slot.x,
      y: slot.y,
      halfWidth: half,
      halfHeight: half,
    });

    if (contact !== null) {
      targets.push({ slotId, distancePx: contact.entryPx, exitPx: contact.exitPx });
    }
  }

  targets.sort((first, second) => {
    if (first.distancePx !== second.distancePx) {
      return first.distancePx - second.distancePx;
    }

    return first.slotId - second.slotId;
  });

  return targets;
}

function getReflectedVisualLength(input: {
  readonly originX: number;
  readonly originY: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly viewport: ViewportRect;
  readonly targets: readonly ReflectedTarget[];
  readonly slots: EnemyWorld['slots'];
  readonly pierce: number;
}): number {
  const edgeDistance = getViewportEdgeDistance(
    input.originX,
    input.originY,
    input.dirX,
    input.dirY,
    input.viewport,
  );
  const budget = 1 + normalizePierce(input.pierce);

  if (input.targets.length < budget) {
    return edgeDistance;
  }

  const lastTarget = input.targets[budget - 1];

  if (lastTarget === undefined) {
    return edgeDistance;
  }

  return input.slots[lastTarget.slotId] === undefined || input.slots[lastTarget.slotId] === null
    ? edgeDistance
    : lastTarget.exitPx;
}

function createReflectedLane(
  origin: { readonly x: number; readonly y: number },
  direction: { readonly x: number; readonly y: number },
  viewport: ViewportRect,
): BeamLane {
  const edgeDistance = getViewportEdgeDistance(
    origin.x,
    origin.y,
    direction.x,
    direction.y,
    viewport,
  );

  return {
    originX: origin.x,
    originY: origin.y,
    dirX: direction.x,
    dirY: direction.y,
    widthPx: REFLECTED_BEAM_WIDTH_PX,
    lengthPx: edgeDistance,
  };
}

function getViewportEdgeDistance(
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  viewport: ViewportRect,
): number {
  const magnitude = Math.hypot(dirX, dirY);

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return 0;
  }

  const unitX = dirX / magnitude;
  const unitY = dirY / magnitude;
  const right = viewport.left + viewport.width;
  const bottom = viewport.top + viewport.height;
  let distance = Number.POSITIVE_INFINITY;

  if (unitX > 0) {
    distance = Math.min(distance, (right - originX) / unitX);
  } else if (unitX < 0) {
    distance = Math.min(distance, (viewport.left - originX) / unitX);
  }

  if (unitY > 0) {
    distance = Math.min(distance, (bottom - originY) / unitY);
  } else if (unitY < 0) {
    distance = Math.min(distance, (viewport.top - originY) / unitY);
  }

  if (!Number.isFinite(distance) || distance < 0) {
    return 0;
  }

  return distance;
}

function resolvePhase(
  phase: ReflectInputPhase,
  engaged: boolean,
  shield: ReflectShieldState,
): ReflectInputPhase {
  if (!engaged) {
    return 'idle';
  }

  if (phase === 'idle') {
    return shield.maxCharges > 0 && shield.charges > 0 ? 'armed' : 'spent';
  }

  if (phase === 'armed') {
    return shield.maxCharges > 0 && shield.charges > 0 ? 'armed' : 'spent';
  }

  return 'spent';
}

function resolveNormal(normal: ShieldNormal, aim: ShieldPoint | null): ShieldNormal {
  if (aim === null) {
    return normal;
  }

  const magnitude = Math.hypot(aim.x, aim.y);

  if (!Number.isFinite(magnitude) || magnitude < 1) {
    return normal;
  }

  return {
    x: aim.x / magnitude,
    y: aim.y / magnitude,
  };
}

function normalizePierce(pierce: number): number {
  if (!Number.isFinite(pierce)) {
    return 0;
  }

  return Math.min(2, Math.max(0, Math.floor(pierce)));
}
