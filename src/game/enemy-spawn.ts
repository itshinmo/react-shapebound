export type SpawnSide = 'top' | 'right' | 'bottom' | 'left';

export interface ViewportRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface SpawnMark {
  readonly side: SpawnSide;
  readonly alongPx: number;
  readonly atMs: number;
}

export interface SpawnBand {
  readonly minPx: number;
  readonly maxPx: number;
}

export const SPAWN_MARGIN_PX = 64;
export const EXIT_MARGIN_PX = 64;
export const SAME_KIND_SPACING_PX = 128;
export const SAME_KIND_SPACING_MS = 1_500;
export const EDGE_BAND_MIN = 0.1;
export const EDGE_BAND_MAX = 0.9;
export const ENEMY_STEP_MS = 20;
export const ENEMY_STEP_SECONDS = ENEMY_STEP_MS / 1_000;
export const ENEMY_SAFETY_LIFETIME_MS = 30_000;
export const RED_TARGET_MAX = 24;
export const TRIANGLE_TARGET_MAX = 12;

export function isViewportSpawnable(viewport: ViewportRect): boolean {
  return (
    Number.isFinite(viewport.left) &&
    Number.isFinite(viewport.top) &&
    Number.isFinite(viewport.width) &&
    Number.isFinite(viewport.height) &&
    viewport.width > SPAWN_MARGIN_PX * 2 &&
    viewport.height > SPAWN_MARGIN_PX * 2
  );
}

export function getEdgeLength(viewport: ViewportRect, side: SpawnSide): number {
  switch (side) {
    case 'top':
    case 'bottom':
      return viewport.width;
    case 'right':
    case 'left':
      return viewport.height;
  }
}

export function getSpawnBand(viewport: ViewportRect, side: SpawnSide): SpawnBand {
  const origin = side === 'top' || side === 'bottom' ? viewport.left : viewport.top;
  const length = getEdgeLength(viewport, side);

  return {
    minPx: origin + length * EDGE_BAND_MIN,
    maxPx: origin + length * EDGE_BAND_MAX,
  };
}

export function sideFromIndex(index: number): SpawnSide {
  switch (index) {
    case 0:
      return 'top';
    case 1:
      return 'right';
    case 2:
      return 'bottom';
    case 3:
      return 'left';
    default:
      throw new RangeError('Spawn side index must be an integer from 0 to 3.');
  }
}

export function getSpawnPoint(
  viewport: ViewportRect,
  side: SpawnSide,
  alongPx: number,
  sizePx: number,
): { readonly x: number; readonly y: number } {
  const outsideDistance = SPAWN_MARGIN_PX + sizePx / 2;

  switch (side) {
    case 'top':
      return { x: alongPx, y: viewport.top - outsideDistance };
    case 'right':
      return { x: viewport.left + viewport.width + outsideDistance, y: alongPx };
    case 'bottom':
      return { x: alongPx, y: viewport.top + viewport.height + outsideDistance };
    case 'left':
      return { x: viewport.left - outsideDistance, y: alongPx };
  }
}

export function applySpacingShift(
  viewport: ViewportRect,
  side: SpawnSide,
  candidateAlongPx: number,
  lastSpawn: SpawnMark | null,
  atMs: number,
): number {
  if (lastSpawn?.side !== side) {
    return candidateAlongPx;
  }

  const elapsedMs = atMs - lastSpawn.atMs;

  if (elapsedMs < 0 || elapsedMs > SAME_KIND_SPACING_MS) {
    return candidateAlongPx;
  }

  if (Math.abs(candidateAlongPx - lastSpawn.alongPx) >= SAME_KIND_SPACING_PX) {
    return candidateAlongPx;
  }

  const band = getSpawnBand(viewport, side);
  const lower = lastSpawn.alongPx - SAME_KIND_SPACING_PX;
  const upper = lastSpawn.alongPx + SAME_KIND_SPACING_PX;
  const lowerInside = lower >= band.minPx && lower <= band.maxPx;
  const upperInside = upper >= band.minPx && upper <= band.maxPx;

  if (!lowerInside && !upperInside) {
    return candidateAlongPx;
  }

  if (lowerInside && !upperInside) {
    return lower;
  }

  if (upperInside && !lowerInside) {
    return upper;
  }

  const lowerDistance = Math.abs(candidateAlongPx - lower);
  const upperDistance = Math.abs(candidateAlongPx - upper);

  return lowerDistance <= upperDistance ? lower : upper;
}

export function redTargetAtMs(tMs: number): number {
  return tMs < 45_000 ? 1 : Math.min(RED_TARGET_MAX, 1 + Math.floor((tMs - 45_000) / 40_000));
}

export function triangleTargetAtMs(tMs: number): number {
  return Math.min(TRIANGLE_TARGET_MAX, redTargetAtMs(tMs));
}

export function getSpawnMark(side: SpawnSide, alongPx: number, atMs: number): SpawnMark {
  return { side, alongPx, atMs };
}
