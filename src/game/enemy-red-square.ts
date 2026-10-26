import { getEnemyHitHalf } from './enemy-collision';
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

export interface RedSquareSlot {
  readonly id: number;
  readonly kind: 'red-square';
  readonly x: number;
  readonly y: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly speedPxPerSec: number;
  readonly sizePx: number;
  readonly spawnSide: SpawnSide;
  readonly spawnedAtMs: number;
  readonly enteredViewport: boolean;
  readonly damagedPlayer: boolean;
}

export interface RedSquareSpawnInput {
  readonly id: number;
  readonly rng: Rng;
  readonly viewport: ViewportRect;
  readonly playerCenter: { readonly x: number; readonly y: number };
  readonly spawnedAtMs: number;
  readonly lastSpawn: SpawnMark | null;
}

export interface RedSquareSpawn {
  readonly slot: RedSquareSlot;
  readonly mark: SpawnMark;
}

export const RED_SQUARE_SIZE_PX = 32;
export const RED_SQUARE_BASE_SPEED_PX_PER_SEC = 108.8;
export const RED_SQUARE_SPEED_GROWTH_PX_PER_SEC = 0.192;
export const RED_SQUARE_MAX_SPEED_PX_PER_SEC = 224;
export const RED_SQUARE_SAFETY_LIFETIME_MS = ENEMY_SAFETY_LIFETIME_MS;

export function redSpeedAtMs(tMs: number): number {
  return Math.min(
    RED_SQUARE_MAX_SPEED_PX_PER_SEC,
    RED_SQUARE_BASE_SPEED_PX_PER_SEC + RED_SQUARE_SPEED_GROWTH_PX_PER_SEC * (tMs / 1_000),
  );
}

export function redAimDirection(
  spawnX: number,
  spawnY: number,
  playerX: number,
  playerY: number,
  spawnSide: SpawnSide,
): { readonly x: number; readonly y: number } {
  const deltaX = playerX - spawnX;
  const deltaY = playerY - spawnY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance === 0 || !Number.isFinite(distance)) {
    return inwardNormal(spawnSide);
  }

  return { x: deltaX / distance, y: deltaY / distance };
}

export function spawnRedSquare(input: RedSquareSpawnInput): RedSquareSpawn {
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
  const spawnPoint = getSpawnPoint(input.viewport, side, alongPx, RED_SQUARE_SIZE_PX);
  const aim = redAimDirection(
    spawnPoint.x,
    spawnPoint.y,
    input.playerCenter.x,
    input.playerCenter.y,
    side,
  );

  return {
    slot: {
      id: input.id,
      kind: 'red-square',
      x: spawnPoint.x,
      y: spawnPoint.y,
      dirX: aim.x,
      dirY: aim.y,
      speedPxPerSec: redSpeedAtMs(input.spawnedAtMs),
      sizePx: RED_SQUARE_SIZE_PX,
      spawnSide: side,
      spawnedAtMs: input.spawnedAtMs,
      enteredViewport: false,
      damagedPlayer: false,
    },
    mark: getSpawnMark(side, alongPx, input.spawnedAtMs),
  };
}

export function stepRedSquare(slot: RedSquareSlot): RedSquareSlot {
  const distance = slot.speedPxPerSec * ENEMY_STEP_SECONDS;

  return {
    ...slot,
    x: slot.x + slot.dirX * distance,
    y: slot.y + slot.dirY * distance,
  };
}

export function markRedEntered(slot: RedSquareSlot, viewport: ViewportRect): RedSquareSlot {
  if (slot.enteredViewport || !overlapsViewport(slot, viewport)) {
    return slot;
  }

  return { ...slot, enteredViewport: true };
}

export function shouldRecycleRedSquare(
  slot: RedSquareSlot,
  viewport: ViewportRect,
  stepEndMs: number,
): boolean {
  if (stepEndMs - slot.spawnedAtMs >= RED_SQUARE_SAFETY_LIFETIME_MS) {
    return true;
  }

  return slot.enteredViewport && isOutsideInflatedViewport(slot, viewport);
}

function overlapsViewport(slot: RedSquareSlot, viewport: ViewportRect): boolean {
  const half = getEnemyHitHalf(slot.sizePx);

  return (
    slot.x + half >= viewport.left &&
    slot.x - half <= viewport.left + viewport.width &&
    slot.y + half >= viewport.top &&
    slot.y - half <= viewport.top + viewport.height
  );
}

function isOutsideInflatedViewport(slot: RedSquareSlot, viewport: ViewportRect): boolean {
  const half = getEnemyHitHalf(slot.sizePx);

  return (
    slot.x + half < viewport.left - EXIT_MARGIN_PX ||
    slot.x - half > viewport.left + viewport.width + EXIT_MARGIN_PX ||
    slot.y + half < viewport.top - EXIT_MARGIN_PX ||
    slot.y - half > viewport.top + viewport.height + EXIT_MARGIN_PX
  );
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
