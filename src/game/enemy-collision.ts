export interface Hurtbox {
  readonly x: number;
  readonly y: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

export interface BeamLane {
  readonly originX: number;
  readonly originY: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly widthPx: number;
  readonly lengthPx: number;
}

export interface ContactCandidate {
  readonly slotId: number;
  readonly contactTime: number;
}

export function getEnemyHitHalf(sizePx: number): number {
  return 0.4 * sizePx;
}

export function sweptRedContact(
  previousX: number,
  previousY: number,
  nextX: number,
  nextY: number,
  sizePx: number,
  hurtbox: Hurtbox,
): number | null {
  const half = getEnemyHitHalf(sizePx);
  const minX = hurtbox.x - hurtbox.halfWidth - half;
  const maxX = hurtbox.x + hurtbox.halfWidth + half;
  const minY = hurtbox.y - hurtbox.halfHeight - half;
  const maxY = hurtbox.y + hurtbox.halfHeight + half;

  if (previousX >= minX && previousX <= maxX && previousY >= minY && previousY <= maxY) {
    return 0;
  }

  const deltaX = nextX - previousX;
  const deltaY = nextY - previousY;
  const xRange = projectSegment(previousX, deltaX, minX, maxX);
  const yRange = projectSegment(previousY, deltaY, minY, maxY);

  if (xRange === null || yRange === null) {
    return null;
  }

  const enter = Math.max(0, xRange.enter, yRange.enter);
  const exit = Math.min(1, xRange.exit, yRange.exit);

  return enter <= exit ? enter : null;
}

export function laneOverlapsHurtbox(lane: BeamLane, hurtbox: Hurtbox): boolean {
  const magnitude = Math.hypot(lane.dirX, lane.dirY);

  if (magnitude === 0 || !Number.isFinite(magnitude)) {
    return false;
  }

  const dirX = lane.dirX / magnitude;
  const dirY = lane.dirY / magnitude;
  const perpendicularX = -dirY;
  const perpendicularY = dirX;
  const halfLength = Math.abs(lane.lengthPx) / 2;
  const halfWidth = Math.abs(lane.widthPx) / 2;
  const centerX = lane.originX + dirX * (lane.lengthPx / 2);
  const centerY = lane.originY + dirY * (lane.lengthPx / 2);
  const deltaX = centerX - hurtbox.x;
  const deltaY = centerY - hurtbox.y;

  const axes = [
    { x: dirX, y: dirY },
    { x: perpendicularX, y: perpendicularY },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];

  for (const axis of axes) {
    const distance = Math.abs(deltaX * axis.x + deltaY * axis.y);
    const laneRadius =
      Math.abs(axis.x * dirX + axis.y * dirY) * halfLength +
      Math.abs(axis.x * perpendicularX + axis.y * perpendicularY) * halfWidth;
    const hurtboxRadius =
      Math.abs(axis.x) * hurtbox.halfWidth + Math.abs(axis.y) * hurtbox.halfHeight;

    if (distance > laneRadius + hurtboxRadius) {
      return false;
    }
  }

  return true;
}

export function pickEarliestContact<T extends ContactCandidate>(
  candidates: readonly T[],
): T | null {
  let earliest: T | null = null;

  for (const candidate of candidates) {
    if (
      earliest === null ||
      candidate.contactTime < earliest.contactTime ||
      (candidate.contactTime === earliest.contactTime && candidate.slotId < earliest.slotId)
    ) {
      earliest = candidate;
    }
  }

  return earliest;
}

function projectSegment(
  origin: number,
  delta: number,
  min: number,
  max: number,
): { readonly enter: number; readonly exit: number } | null {
  if (delta === 0) {
    return origin >= min && origin <= max
      ? { enter: Number.NEGATIVE_INFINITY, exit: Number.POSITIVE_INFINITY }
      : null;
  }

  const first = (min - origin) / delta;
  const second = (max - origin) / delta;

  return {
    enter: Math.min(first, second),
    exit: Math.max(first, second),
  };
}
