import { getEnemyHitHalf, type BeamLane } from './enemy-collision';
import {
  ENEMY_SAFETY_LIFETIME_MS,
  ENEMY_STEP_SECONDS,
  EXIT_MARGIN_PX,
  applySpacingShift,
  getSpawnBand,
  getSpawnMark,
  getSpawnPoint,
  sideFromIndex,
  type SpawnMark,
  type SpawnSide,
  type ViewportRect,
} from './enemy-spawn';

import type { Rng } from './rng';

export type TrianglePhase = 'approach' | 'aimed' | 'charging' | 'firing' | 'exiting';

export interface TriangleSlot {
  readonly id: number;
  readonly kind: 'orange-triangle';
  readonly phase: TrianglePhase;
  readonly x: number;
  readonly y: number;
  readonly stopX: number;
  readonly stopY: number;
  readonly aimX: number;
  readonly aimY: number;
  readonly approachSpeedPxPerSec: number;
  readonly exitSpeedPxPerSec: number;
  readonly spawnedAtMs: number;
  readonly arrivedAtMs: number | null;
  readonly chargeEndsAtMs: number | null;
  readonly beamEndsAtMs: number | null;
  readonly lane: BeamLane | null;
  readonly sizePx: number;
  readonly enteredViewport: boolean;
  readonly damagedPlayer: boolean;
}

export interface TriangleSpawnInput {
  readonly id: number;
  readonly rng: Rng;
  readonly viewport: ViewportRect;
  readonly playerCenter: { readonly x: number; readonly y: number };
  readonly spawnedAtMs: number;
  readonly lastSpawn: SpawnMark | null;
}

export interface TriangleSpawn {
  readonly slot: TriangleSlot;
  readonly mark: SpawnMark;
}

export interface TriangleStepInput {
  readonly stepEndMs: number;
  readonly viewport: ViewportRect;
  readonly playerCenter: { readonly x: number; readonly y: number };
}

export interface TriangleStepResult {
  readonly slot: TriangleSlot;
  readonly fired: boolean;
}

export const TRIANGLE_SIZE_PX = 40;
const TRIANGLE_SPAWN_ENVELOPE_PX = TRIANGLE_SIZE_PX * Math.SQRT2;
export const TRIANGLE_APPROACH_BASE_SPEED_PX_PER_SEC = 89.6;
export const TRIANGLE_APPROACH_SPEED_GROWTH_PX_PER_SEC = 0.128;
export const TRIANGLE_APPROACH_MAX_SPEED_PX_PER_SEC = 176;
export const TRIANGLE_EXIT_SPEED_FACTOR = 1.25;
export const TRIANGLE_CHARGE_BASE_MS = 1_600;
export const TRIANGLE_CHARGE_MIN_MS = 700;
export const TRIANGLE_BEAM_WIDTH_PX = 57.6;
export const TRIANGLE_BEAM_LINGER_MS = 180;
export const TRIANGLE_STOP_MIN_PLAYER_DISTANCE_PX = 128;
export const TRIANGLE_STOP_INWARD_FACTOR = 0.35;
export const TRIANGLE_STOP_LATERAL_FACTOR = 0.25;
export const TRIANGLE_VIEWPORT_INSET_FACTOR = 0.08;
export const TRIANGLE_VIEWPORT_INSET_MIN_PX = 36;
export const TRIANGLE_MAX_WARNINGS = 6;
export const TRIANGLE_STOP_CANDIDATES = 3;
export const TRIANGLE_SAFETY_LIFETIME_MS = ENEMY_SAFETY_LIFETIME_MS;

export function triangleApproachSpeedAtMs(tMs: number): number {
  return Math.min(
    TRIANGLE_APPROACH_MAX_SPEED_PX_PER_SEC,
    TRIANGLE_APPROACH_BASE_SPEED_PX_PER_SEC +
      TRIANGLE_APPROACH_SPEED_GROWTH_PX_PER_SEC * (tMs / 1_000),
  );
}

export function chargeMsAtMs(tMs: number): number {
  return Math.max(TRIANGLE_CHARGE_MIN_MS, TRIANGLE_CHARGE_BASE_MS - Math.floor(tMs / 1_000));
}

export function createBeamLane(
  stopX: number,
  stopY: number,
  aimX: number,
  aimY: number,
  viewport: ViewportRect,
): BeamLane {
  const originX = stopX + aimX * (TRIANGLE_SIZE_PX / 2);
  const originY = stopY + aimY * (TRIANGLE_SIZE_PX / 2);
  const boundaryDistance = distanceToViewportBoundary(originX, originY, aimX, aimY, viewport);

  return {
    originX,
    originY,
    dirX: aimX,
    dirY: aimY,
    widthPx: TRIANGLE_BEAM_WIDTH_PX,
    lengthPx: Math.max(0, boundaryDistance + EXIT_MARGIN_PX),
  };
}

export function spawnTriangle(input: TriangleSpawnInput): TriangleSpawn | null {
  const side = sideFromIndex(input.rng.nextInt(4));
  const alongFraction = input.rng.next();
  const band = getSpawnBand(input.viewport, side);
  const candidateAlongPx = band.minPx + (band.maxPx - band.minPx) * alongFraction;
  const alongPx = applySpacingShift(
    input.viewport,
    side,
    candidateAlongPx,
    input.lastSpawn,
    input.spawnedAtMs,
  );
  const shortSide = Math.min(input.viewport.width, input.viewport.height);
  const inset = Math.max(
    TRIANGLE_VIEWPORT_INSET_FACTOR * shortSide,
    TRIANGLE_VIEWPORT_INSET_MIN_PX,
  );

  if (input.viewport.width < inset * 2 || input.viewport.height < inset * 2) {
    return null;
  }

  for (let attempt = 0; attempt < TRIANGLE_STOP_CANDIDATES; attempt += 1) {
    const inward = input.rng.next();
    const lateral = input.rng.next();
    const stop = getStopCandidate(
      input.viewport,
      side,
      alongPx,
      inward,
      lateral,
      input.playerCenter.x,
      input.playerCenter.y,
    );

    if (stop === null) {
      continue;
    }

    const spawnPoint = getSpawnPoint(input.viewport, side, alongPx, TRIANGLE_SPAWN_ENVELOPE_PX);
    const fallback = inwardNormal(side);
    const aim = normalizeDirection(
      stop.x - spawnPoint.x,
      stop.y - spawnPoint.y,
      fallback.x,
      fallback.y,
    );
    const approachSpeedPxPerSec = triangleApproachSpeedAtMs(input.spawnedAtMs);

    return {
      slot: {
        id: input.id,
        kind: 'orange-triangle',
        phase: 'approach',
        x: spawnPoint.x,
        y: spawnPoint.y,
        stopX: stop.x,
        stopY: stop.y,
        aimX: aim.x,
        aimY: aim.y,
        approachSpeedPxPerSec,
        exitSpeedPxPerSec: approachSpeedPxPerSec * TRIANGLE_EXIT_SPEED_FACTOR,
        spawnedAtMs: input.spawnedAtMs,
        arrivedAtMs: null,
        chargeEndsAtMs: null,
        beamEndsAtMs: null,
        lane: null,
        sizePx: TRIANGLE_SIZE_PX,
        enteredViewport: false,
        damagedPlayer: false,
      },
      mark: getSpawnMark(side, alongPx, input.spawnedAtMs),
    };
  }

  return null;
}

export function stepTriangle(
  slot: TriangleSlot,
  input: TriangleStepInput,
): TriangleStepResult | null {
  switch (slot.phase) {
    case 'approach':
      return stepApproach(slot, input);
    case 'aimed':
      return { slot, fired: false };
    case 'charging':
      return stepCharging(slot, input);
    case 'firing':
      return stepFiring(slot, input);
    case 'exiting':
      return { slot: stepExit(slot), fired: false };
  }
}

export function startTriangleCharge(slot: TriangleSlot, stepEndMs: number): TriangleSlot {
  if (slot.phase !== 'aimed' || slot.lane === null) {
    return slot;
  }

  return {
    ...slot,
    phase: 'charging',
    chargeEndsAtMs: stepEndMs + chargeMsAtMs(stepEndMs),
  };
}

export function markTriangleEntered(slot: TriangleSlot, viewport: ViewportRect): TriangleSlot {
  if (slot.enteredViewport || !overlapsViewport(slot, viewport)) {
    return slot;
  }

  return { ...slot, enteredViewport: true };
}

export function shouldRecycleTriangle(
  slot: TriangleSlot,
  viewport: ViewportRect,
  stepEndMs: number,
): boolean {
  if (stepEndMs - slot.spawnedAtMs >= TRIANGLE_SAFETY_LIFETIME_MS) {
    return true;
  }

  return slot.enteredViewport && isOutsideInflatedViewport(slot, viewport);
}

function stepApproach(slot: TriangleSlot, input: TriangleStepInput): TriangleStepResult | null {
  const stepDistance = slot.approachSpeedPxPerSec * ENEMY_STEP_SECONDS;
  const remainingDistance = Math.hypot(slot.stopX - slot.x, slot.stopY - slot.y);

  if (remainingDistance <= stepDistance) {
    if (!isInsideInset(slot.stopX, slot.stopY, input.viewport)) {
      return null;
    }

    const aim = aimAtPoint(
      slot.stopX,
      slot.stopY,
      input.playerCenter.x,
      input.playerCenter.y,
      slot.aimX,
      slot.aimY,
    );
    const lane = createBeamLane(slot.stopX, slot.stopY, aim.x, aim.y, input.viewport);

    return {
      slot: {
        ...slot,
        x: slot.stopX,
        y: slot.stopY,
        phase: 'aimed',
        aimX: aim.x,
        aimY: aim.y,
        arrivedAtMs: input.stepEndMs,
        lane,
      },
      fired: false,
    };
  }

  return {
    slot: {
      ...slot,
      x: slot.x + slot.aimX * stepDistance,
      y: slot.y + slot.aimY * stepDistance,
    },
    fired: false,
  };
}

function stepCharging(slot: TriangleSlot, input: TriangleStepInput): TriangleStepResult {
  if (slot.chargeEndsAtMs !== null && input.stepEndMs >= slot.chargeEndsAtMs) {
    return {
      slot: {
        ...slot,
        phase: 'firing',
        beamEndsAtMs: input.stepEndMs + TRIANGLE_BEAM_LINGER_MS,
      },
      fired: true,
    };
  }

  return { slot, fired: false };
}

function stepFiring(slot: TriangleSlot, input: TriangleStepInput): TriangleStepResult {
  if (slot.beamEndsAtMs !== null && input.stepEndMs >= slot.beamEndsAtMs) {
    return { slot: stepExit(slot), fired: false };
  }

  return { slot, fired: false };
}

function stepExit(slot: TriangleSlot): TriangleSlot {
  const distance = slot.exitSpeedPxPerSec * ENEMY_STEP_SECONDS;

  return {
    ...slot,
    phase: 'exiting',
    x: slot.x + slot.aimX * distance,
    y: slot.y + slot.aimY * distance,
  };
}

function getStopCandidate(
  viewport: ViewportRect,
  side: SpawnSide,
  spawnAlongPx: number,
  inward: number,
  lateral: number,
  playerX: number,
  playerY: number,
): { readonly x: number; readonly y: number } | null {
  const shortSide = Math.min(viewport.width, viewport.height);
  const inset = Math.max(
    TRIANGLE_VIEWPORT_INSET_FACTOR * shortSide,
    TRIANGLE_VIEWPORT_INSET_MIN_PX,
  );
  const right = viewport.left + viewport.width;
  const bottom = viewport.top + viewport.height;
  const minX = viewport.left + inset;
  const maxX = right - inset;
  const minY = viewport.top + inset;
  const maxY = bottom - inset;

  if (minX > maxX || minY > maxY) {
    return null;
  }

  const lateralMin = side === 'top' || side === 'bottom' ? minX : minY;
  const lateralMax = side === 'top' || side === 'bottom' ? maxX : maxY;
  const lateralPx = clamp(
    spawnAlongPx + TRIANGLE_STOP_LATERAL_FACTOR * shortSide * (2 * lateral - 1),
    lateralMin,
    lateralMax,
  );
  const inwardOffset = inset + inward * TRIANGLE_STOP_INWARD_FACTOR * shortSide;

  let x: number;
  let y: number;

  switch (side) {
    case 'top':
      x = lateralPx;
      y = viewport.top + inwardOffset;
      break;
    case 'right':
      x = right - inwardOffset;
      y = lateralPx;
      break;
    case 'bottom':
      x = lateralPx;
      y = bottom - inwardOffset;
      break;
    case 'left':
      x = viewport.left + inwardOffset;
      y = lateralPx;
      break;
  }

  if (x < minX || x > maxX || y < minY || y > maxY) {
    return null;
  }

  if (Math.hypot(x - playerX, y - playerY) < TRIANGLE_STOP_MIN_PLAYER_DISTANCE_PX) {
    return null;
  }

  return { x, y };
}

function isInsideInset(x: number, y: number, viewport: ViewportRect): boolean {
  const shortSide = Math.min(viewport.width, viewport.height);
  const inset = Math.max(
    TRIANGLE_VIEWPORT_INSET_FACTOR * shortSide,
    TRIANGLE_VIEWPORT_INSET_MIN_PX,
  );

  return (
    x >= viewport.left + inset &&
    x <= viewport.left + viewport.width - inset &&
    y >= viewport.top + inset &&
    y <= viewport.top + viewport.height - inset
  );
}

function aimAtPoint(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  fallbackX: number,
  fallbackY: number,
): { readonly x: number; readonly y: number } {
  const deltaX = targetX - originX;
  const deltaY = targetY - originY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance < 1) {
    return { x: fallbackX, y: fallbackY };
  }

  return { x: deltaX / distance, y: deltaY / distance };
}

function normalizeDirection(
  deltaX: number,
  deltaY: number,
  fallbackX: number,
  fallbackY: number,
): { readonly x: number; readonly y: number } {
  const distance = Math.hypot(deltaX, deltaY);

  if (distance === 0 || !Number.isFinite(distance)) {
    return { x: fallbackX, y: fallbackY };
  }

  return { x: deltaX / distance, y: deltaY / distance };
}

function inwardNormal(side: SpawnSide): { readonly x: number; readonly y: number } {
  switch (side) {
    case 'top':
      return { x: 0, y: 1 };
    case 'right':
      return { x: -1, y: 0 };
    case 'bottom':
      return { x: 0, y: -1 };
    case 'left':
      return { x: 1, y: 0 };
  }
}

function overlapsViewport(slot: TriangleSlot, viewport: ViewportRect): boolean {
  const half = getEnemyHitHalf(slot.sizePx);

  return (
    slot.x + half >= viewport.left &&
    slot.x - half <= viewport.left + viewport.width &&
    slot.y + half >= viewport.top &&
    slot.y - half <= viewport.top + viewport.height
  );
}

function isOutsideInflatedViewport(slot: TriangleSlot, viewport: ViewportRect): boolean {
  const half = getEnemyHitHalf(slot.sizePx);

  return (
    slot.x + half < viewport.left - EXIT_MARGIN_PX ||
    slot.x - half > viewport.left + viewport.width + EXIT_MARGIN_PX ||
    slot.y + half < viewport.top - EXIT_MARGIN_PX ||
    slot.y - half > viewport.top + viewport.height + EXIT_MARGIN_PX
  );
}

function distanceToViewportBoundary(
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  viewport: ViewportRect,
): number {
  const xRange = projectRay(originX, dirX, viewport.left, viewport.left + viewport.width);
  const yRange = projectRay(originY, dirY, viewport.top, viewport.top + viewport.height);

  if (xRange === null || yRange === null) {
    return 0;
  }

  const enter = Math.max(xRange.enter, yRange.enter);
  const exit = Math.min(xRange.exit, yRange.exit);

  if (exit < 0 || enter > exit) {
    return 0;
  }

  return Math.max(0, exit);
}

function projectRay(
  origin: number,
  direction: number,
  min: number,
  max: number,
): { readonly enter: number; readonly exit: number } | null {
  if (direction === 0) {
    return origin >= min && origin <= max
      ? { enter: Number.NEGATIVE_INFINITY, exit: Number.POSITIVE_INFINITY }
      : null;
  }

  const first = (min - origin) / direction;
  const second = (max - origin) / direction;

  return {
    enter: Math.min(first, second),
    exit: Math.max(first, second),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
