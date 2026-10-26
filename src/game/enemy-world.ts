import {
  getEnemyHitHalf,
  laneOverlapsHurtbox,
  pickEarliestContact,
  sweptRedContact,
  type BeamLane,
  type ContactCandidate,
  type Hurtbox,
} from './enemy-collision';
import {
  TRIANGLE_MAX_WARNINGS,
  markTriangleEntered,
  shouldRecycleTriangle,
  spawnTriangle,
  startTriangleCharge,
  stepTriangle,
  type TriangleSlot,
} from './enemy-orange-triangle';
import {
  markRedEntered,
  shouldRecycleRedSquare,
  spawnRedSquare,
  stepRedSquare,
  type RedSquareSlot,
} from './enemy-red-square';
import {
  ENEMY_SAFETY_LIFETIME_MS,
  ENEMY_STEP_MS,
  EXIT_MARGIN_PX,
  RED_TARGET_MAX,
  TRIANGLE_TARGET_MAX,
  isViewportSpawnable,
  redTargetAtMs,
  triangleTargetAtMs,
  type SpawnMark,
  type ViewportRect,
} from './enemy-spawn';
import { createRng } from './rng';

export { ENEMY_SAFETY_LIFETIME_MS, ENEMY_STEP_MS };

export type EnemyKind = 'red-square' | 'orange-triangle';
export type EnemySlot = RedSquareSlot | TriangleSlot;

export interface HitIntent {
  readonly slotId: number;
  readonly kind: EnemyKind;
  readonly atMs: number;
}

export interface EnemyWorld {
  readonly slots: readonly (EnemySlot | null)[];
  readonly nextRedSpawnAtMs: number;
  readonly nextTriangleSpawnAtMs: number;
  readonly redRngState: number;
  readonly triangleRngState: number;
  readonly lastSpawn: {
    readonly red: SpawnMark | null;
    readonly triangle: SpawnMark | null;
  };
  readonly playerInvulnerableUntilMs: number;
}

export interface EnemyStepInput {
  readonly stepEndMs: number;
  readonly viewport: ViewportRect;
  readonly playerHurtbox: Hurtbox;
  readonly playerAlive: boolean;
}

export interface EnemyStepResult {
  readonly world: EnemyWorld;
  readonly hit: HitIntent | null;
}

export interface EnemyCounts {
  readonly total: number;
  readonly red: number;
  readonly triangle: number;
}

export const ENEMY_SLOT_COUNT = 24;
export const RED_SPAWN_CADENCE_MS = 900;
export const TRIANGLE_SPAWN_CADENCE_MS = 1_600;
export const RED_FIRST_SPAWN_MS = 2_000;
export const TRIANGLE_FIRST_SPAWN_MS = 45_000;
export const MAX_RED_SQUARES = RED_TARGET_MAX;
export const MAX_TRIANGLES = TRIANGLE_TARGET_MAX;
export const MAX_CHARGING_TRIANGLES = TRIANGLE_MAX_WARNINGS;
export const POST_HIT_INVULNERABILITY_MS = 500;

interface DamageCandidate extends ContactCandidate {
  readonly kind: EnemyKind;
}

interface FireEvent {
  readonly slotId: number;
  readonly lane: BeamLane;
}

export function createEnemyWorld(seed: number): EnemyWorld {
  const slots: (EnemySlot | null)[] = [];

  for (let index = 0; index < ENEMY_SLOT_COUNT; index += 1) {
    slots.push(null);
  }

  return {
    slots,
    nextRedSpawnAtMs: RED_FIRST_SPAWN_MS,
    nextTriangleSpawnAtMs: TRIANGLE_FIRST_SPAWN_MS,
    redRngState: (seed + 0x9e3779b9) >>> 0,
    triangleRngState: (seed + 0xc2b2ae35) >>> 0,
    lastSpawn: { red: null, triangle: null },
    playerInvulnerableUntilMs: 0,
  };
}

export function stepEnemies(world: EnemyWorld, input: EnemyStepInput): EnemyStepResult {
  if (!input.playerAlive) {
    return { world, hit: null };
  }

  if (!Number.isFinite(input.stepEndMs) || input.stepEndMs < 0) {
    return { world, hit: null };
  }

  const slots: (EnemySlot | null)[] = [...world.slots];
  let playerInvulnerableUntilMs = world.playerInvulnerableUntilMs;

  preCullOutsideViewport(slots, input.viewport);
  promoteWaitingTriangles(slots, input.stepEndMs);
  const chargingAtArrival = countChargingSlots(slots);

  const previousReds = new Map<number, { readonly x: number; readonly y: number }>();
  const fireEvents: FireEvent[] = [];
  const newlyArrived: TriangleSlot[] = [];

  for (let id = 0; id < slots.length; id += 1) {
    const slot = slots[id];

    if (slot === undefined || slot === null) {
      continue;
    }

    if (slot.kind === 'red-square') {
      previousReds.set(slot.id, { x: slot.x, y: slot.y });
      slots[id] = stepRedSquare(slot);
      continue;
    }

    const wasApproaching = slot.phase === 'approach';
    const result = stepTriangle(slot, {
      stepEndMs: input.stepEndMs,
      viewport: input.viewport,
      playerCenter: { x: input.playerHurtbox.x, y: input.playerHurtbox.y },
    });

    if (result === null) {
      slots[id] = null;
      continue;
    }

    slots[id] = result.slot;

    if (result.fired && result.slot.lane !== null) {
      fireEvents.push({ slotId: result.slot.id, lane: result.slot.lane });
    }

    if (wasApproaching && result.slot.phase === 'aimed') {
      newlyArrived.push(result.slot);
    }
  }

  promoteNewlyArrivedTriangles(slots, newlyArrived, input.stepEndMs, chargingAtArrival);

  const candidates: DamageCandidate[] = [];

  if (input.stepEndMs >= playerInvulnerableUntilMs) {
    for (const slot of slots) {
      if (slot?.kind !== 'red-square' || slot.damagedPlayer) {
        continue;
      }

      const previous = previousReds.get(slot.id);

      if (previous === undefined) {
        continue;
      }

      const contactTime = sweptRedContact(
        previous.x,
        previous.y,
        slot.x,
        slot.y,
        slot.sizePx,
        input.playerHurtbox,
      );

      if (contactTime !== null) {
        candidates.push({ slotId: slot.id, kind: 'red-square', contactTime });
      }
    }

    for (const event of fireEvents) {
      if (laneOverlapsHurtbox(event.lane, input.playerHurtbox)) {
        candidates.push({
          slotId: event.slotId,
          kind: 'orange-triangle',
          contactTime: 1,
        });
      }
    }
  }

  const selected = pickEarliestContact(candidates);
  let hit: HitIntent | null = null;

  if (selected !== null) {
    if (selected.kind === 'red-square') {
      const target = slots[selected.slotId];

      if (target?.kind === 'red-square') {
        slots[selected.slotId] = { ...target, damagedPlayer: true };
      }
    }

    playerInvulnerableUntilMs = input.stepEndMs + POST_HIT_INVULNERABILITY_MS;
    hit = {
      slotId: selected.slotId,
      kind: selected.kind,
      atMs: input.stepEndMs,
    };
  }

  markEntryAndRecycle(slots, input.viewport, input.stepEndMs);

  let nextRedSpawnAtMs = world.nextRedSpawnAtMs;
  let nextTriangleSpawnAtMs = world.nextTriangleSpawnAtMs;
  let redRngState = world.redRngState;
  let triangleRngState = world.triangleRngState;
  let lastRed = world.lastSpawn.red;
  let lastTriangle = world.lastSpawn.triangle;

  if (input.stepEndMs >= nextRedSpawnAtMs) {
    nextRedSpawnAtMs += RED_SPAWN_CADENCE_MS;

    const freeIndex = findFreeSlotIndex(slots);
    const redCount = countKind(slots, 'red-square');

    if (
      redCount < MAX_RED_SQUARES &&
      redCount < redTargetAtMs(input.stepEndMs) &&
      freeIndex !== -1 &&
      isViewportSpawnable(input.viewport)
    ) {
      const rng = createRng(redRngState);
      const spawn = spawnRedSquare({
        id: freeIndex,
        rng,
        viewport: input.viewport,
        playerCenter: { x: input.playerHurtbox.x, y: input.playerHurtbox.y },
        spawnedAtMs: input.stepEndMs,
        lastSpawn: lastRed,
      });

      slots[freeIndex] = spawn.slot;
      lastRed = spawn.mark;
      redRngState = rng.getState();
    }
  }

  if (input.stepEndMs >= nextTriangleSpawnAtMs) {
    nextTriangleSpawnAtMs += TRIANGLE_SPAWN_CADENCE_MS;

    const freeIndex = findFreeSlotIndex(slots);
    const triangleCount = countKind(slots, 'orange-triangle');

    if (
      triangleCount < MAX_TRIANGLES &&
      triangleCount < triangleTargetAtMs(input.stepEndMs) &&
      freeIndex !== -1 &&
      isViewportSpawnable(input.viewport)
    ) {
      const rng = createRng(triangleRngState);
      const spawn = spawnTriangle({
        id: freeIndex,
        rng,
        viewport: input.viewport,
        playerCenter: { x: input.playerHurtbox.x, y: input.playerHurtbox.y },
        spawnedAtMs: input.stepEndMs,
        lastSpawn: lastTriangle,
      });

      triangleRngState = rng.getState();

      if (spawn !== null) {
        slots[freeIndex] = spawn.slot;
        lastTriangle = spawn.mark;
      }
    }
  }

  return {
    world: {
      slots,
      nextRedSpawnAtMs,
      nextTriangleSpawnAtMs,
      redRngState,
      triangleRngState,
      lastSpawn: { red: lastRed, triangle: lastTriangle },
      playerInvulnerableUntilMs,
    },
    hit,
  };
}

export function getActiveCounts(world: EnemyWorld): EnemyCounts {
  let red = 0;
  let triangle = 0;

  for (const slot of world.slots) {
    if (slot === null) {
      continue;
    }

    if (slot.kind === 'red-square') {
      red += 1;
    } else {
      triangle += 1;
    }
  }

  return { total: red + triangle, red, triangle };
}

export function getFreeSlotCount(world: EnemyWorld): number {
  let free = 0;

  for (const slot of world.slots) {
    if (slot === null) {
      free += 1;
    }
  }

  return free;
}

export function getChargingCount(world: EnemyWorld): number {
  let charging = 0;

  for (const slot of world.slots) {
    if (slot !== null && slot.kind === 'orange-triangle' && slot.phase === 'charging') {
      charging += 1;
    }
  }

  return charging;
}

export function getWarningLanes(world: EnemyWorld): readonly BeamLane[] {
  const lanes: BeamLane[] = [];

  for (const slot of world.slots) {
    if (slot?.kind !== 'orange-triangle' || slot.phase !== 'charging' || slot.lane === null) {
      continue;
    }

    lanes.push(slot.lane);

    if (lanes.length === TRIANGLE_MAX_WARNINGS) {
      break;
    }
  }

  return lanes;
}

export function getBeamLanes(world: EnemyWorld): readonly BeamLane[] {
  const lanes: BeamLane[] = [];

  for (const slot of world.slots) {
    if (slot?.kind !== 'orange-triangle' || slot.phase !== 'firing' || slot.lane === null) {
      continue;
    }

    lanes.push(slot.lane);

    if (lanes.length === TRIANGLE_MAX_WARNINGS) {
      break;
    }
  }

  return lanes;
}

function preCullOutsideViewport(slots: (EnemySlot | null)[], viewport: ViewportRect): void {
  for (let id = 0; id < slots.length; id += 1) {
    const slot = slots[id];

    if (slot === undefined || slot === null) {
      continue;
    }

    if (slot.enteredViewport && isOutsideInflated(slot, viewport)) {
      slots[id] = null;
    }
  }
}

function promoteWaitingTriangles(slots: (EnemySlot | null)[], stepEndMs: number): void {
  let capacity = MAX_CHARGING_TRIANGLES - countChargingSlots(slots);

  if (capacity <= 0) {
    return;
  }

  const waiting: TriangleSlot[] = [];

  for (const slot of slots) {
    if (
      slot !== null &&
      slot.kind === 'orange-triangle' &&
      slot.phase === 'aimed' &&
      slot.arrivedAtMs !== null
    ) {
      waiting.push(slot);
    }
  }

  waiting.sort((first, second) => {
    const firstArrivedAt = first.arrivedAtMs ?? 0;
    const secondArrivedAt = second.arrivedAtMs ?? 0;

    if (firstArrivedAt !== secondArrivedAt) {
      return firstArrivedAt - secondArrivedAt;
    }

    return first.id - second.id;
  });

  for (const triangle of waiting) {
    if (capacity <= 0) {
      break;
    }

    const charged = startTriangleCharge(triangle, stepEndMs);

    if (charged.phase === 'charging') {
      slots[triangle.id] = charged;
      capacity -= 1;
    }
  }
}

function promoteNewlyArrivedTriangles(
  slots: (EnemySlot | null)[],
  newlyArrived: readonly TriangleSlot[],
  stepEndMs: number,
  chargingAtArrival: number,
): void {
  const occupied = Math.max(chargingAtArrival, countChargingSlots(slots));
  let capacity = MAX_CHARGING_TRIANGLES - occupied;

  if (capacity <= 0) {
    return;
  }

  const ordered = [...newlyArrived].sort((first, second) => {
    const firstArrivedAt = first.arrivedAtMs ?? 0;
    const secondArrivedAt = second.arrivedAtMs ?? 0;

    if (firstArrivedAt !== secondArrivedAt) {
      return firstArrivedAt - secondArrivedAt;
    }

    return first.id - second.id;
  });

  for (const triangle of ordered) {
    if (capacity <= 0) {
      break;
    }

    const slot = slots[triangle.id];

    if (slot?.kind !== 'orange-triangle' || slot.phase !== 'aimed') {
      continue;
    }

    const charged = startTriangleCharge(slot, stepEndMs);

    if (charged.phase === 'charging') {
      slots[triangle.id] = charged;
      capacity -= 1;
    }
  }
}

function markEntryAndRecycle(
  slots: (EnemySlot | null)[],
  viewport: ViewportRect,
  stepEndMs: number,
): void {
  for (let id = 0; id < slots.length; id += 1) {
    const slot = slots[id];

    if (slot === undefined || slot === null) {
      continue;
    }

    if (slot.kind === 'red-square') {
      const entered = markRedEntered(slot, viewport);
      slots[id] = shouldRecycleRedSquare(entered, viewport, stepEndMs) ? null : entered;
      continue;
    }

    const entered = markTriangleEntered(slot, viewport);
    slots[id] = shouldRecycleTriangle(entered, viewport, stepEndMs) ? null : entered;
  }
}

function isOutsideInflated(slot: EnemySlot, viewport: ViewportRect): boolean {
  const half = getEnemyHitHalf(slot.sizePx);

  return (
    slot.x + half < viewport.left - EXIT_MARGIN_PX ||
    slot.x - half > viewport.left + viewport.width + EXIT_MARGIN_PX ||
    slot.y + half < viewport.top - EXIT_MARGIN_PX ||
    slot.y - half > viewport.top + viewport.height + EXIT_MARGIN_PX
  );
}

function countKind(slots: readonly (EnemySlot | null)[], kind: EnemyKind): number {
  let count = 0;

  for (const slot of slots) {
    if (slot !== null && slot.kind === kind) {
      count += 1;
    }
  }

  return count;
}

function countChargingSlots(slots: readonly (EnemySlot | null)[]): number {
  let charging = 0;

  for (const slot of slots) {
    if (slot !== null && slot.kind === 'orange-triangle' && slot.phase === 'charging') {
      charging += 1;
    }
  }

  return charging;
}

function findFreeSlotIndex(slots: readonly (EnemySlot | null)[]): number {
  return slots.indexOf(null);
}
