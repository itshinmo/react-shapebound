import type { ShieldSegment } from './reflect-shield';

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

export interface ReflectionDirection {
  readonly x: number;
  readonly y: number;
}

export interface LaneShieldContact {
  readonly distancePx: number;
  readonly x: number;
  readonly y: number;
}

export interface LaneReflection {
  readonly originX: number;
  readonly originY: number;
  readonly contactX: number;
  readonly contactY: number;
  readonly distancePx: number;
  readonly dirX: number;
  readonly dirY: number;
}

export const REFLECT_GRAZING_EPSILON = 0.35;

export function getEnemyHitHalf(sizePx: number): number {
  return 0.4 * sizePx;
}

export function getReflectionDirection(
  lane: BeamLane,
  normalX: number,
  normalY: number,
  epsilon: number = REFLECT_GRAZING_EPSILON,
): ReflectionDirection | null {
  const laneMagnitude = Math.hypot(lane.dirX, lane.dirY);
  const normalMagnitude = Math.hypot(normalX, normalY);

  if (
    !Number.isFinite(laneMagnitude) ||
    laneMagnitude === 0 ||
    !Number.isFinite(normalMagnitude) ||
    normalMagnitude === 0
  ) {
    return null;
  }

  const dirX = lane.dirX / laneMagnitude;
  const dirY = lane.dirY / laneMagnitude;
  const unitNormalX = normalX / normalMagnitude;
  const unitNormalY = normalY / normalMagnitude;
  const dot = dirX * unitNormalX + dirY * unitNormalY;

  if (Math.abs(dot) < epsilon) {
    return null;
  }

  const reflectedX = dirX - 2 * dot * unitNormalX;
  const reflectedY = dirY - 2 * dot * unitNormalY;
  const reflectedMagnitude = Math.hypot(reflectedX, reflectedY);

  if (!Number.isFinite(reflectedMagnitude) || reflectedMagnitude === 0) {
    return null;
  }

  return {
    x: reflectedX / reflectedMagnitude,
    y: reflectedY / reflectedMagnitude,
  };
}

export function getLaneSegmentContact(
  lane: BeamLane,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): LaneShieldContact | null {
  const magnitude = Math.hypot(lane.dirX, lane.dirY);

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return null;
  }

  const dirX = lane.dirX / magnitude;
  const dirY = lane.dirY / magnitude;
  const perpendicularX = -dirY;
  const perpendicularY = dirX;
  const halfWidth = Math.abs(lane.widthPx) / 2;
  const laneStart = Math.min(0, lane.lengthPx);
  const laneEnd = Math.max(0, lane.lengthPx);
  const originX = ax - lane.originX;
  const originY = ay - lane.originY;
  const deltaX = bx - ax;
  const deltaY = by - ay;
  const startU = originX * dirX + originY * dirY;
  const startV = originX * perpendicularX + originY * perpendicularY;
  const deltaU = deltaX * dirX + deltaY * dirY;
  const deltaV = deltaX * perpendicularX + deltaY * perpendicularY;
  const axes = [
    { value: startU, delta: deltaU, min: laneStart, max: laneEnd },
    { value: startV, delta: deltaV, min: -halfWidth, max: halfWidth },
  ];
  let enter = 0;
  let exit = 1;

  for (const axis of axes) {
    if (Math.abs(axis.delta) < Number.EPSILON) {
      if (axis.value < axis.min || axis.value > axis.max) {
        return null;
      }

      continue;
    }

    const first = (axis.min - axis.value) / axis.delta;
    const second = (axis.max - axis.value) / axis.delta;

    enter = Math.max(enter, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));

    if (enter > exit) {
      return null;
    }
  }

  const enterU = startU + deltaU * enter;
  const exitU = startU + deltaU * exit;
  const useCenterline = Math.abs(enterU - exitU) < Number.EPSILON;
  const centerT = Math.abs(deltaV) >= Number.EPSILON ? -startV / deltaV : null;

  if (useCenterline && centerT !== null && centerT >= enter && centerT <= exit) {
    return {
      distancePx: startU + deltaU * centerT,
      x: ax + deltaX * centerT,
      y: ay + deltaY * centerT,
    };
  }

  const useEnter = enterU <= exitU;
  const t = useEnter ? enter : exit;

  return {
    distancePx: useEnter ? enterU : exitU,
    x: ax + deltaX * t,
    y: ay + deltaY * t,
  };
}

export interface LaneAabbContact {
  readonly entryPx: number;
  readonly exitPx: number;
}

export function getLaneAabbContact(lane: BeamLane, hurtbox: Hurtbox): LaneAabbContact | null {
  const magnitude = Math.hypot(lane.dirX, lane.dirY);

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return null;
  }

  const dirX = lane.dirX / magnitude;
  const dirY = lane.dirY / magnitude;
  const perpendicularX = -dirY;
  const perpendicularY = dirX;
  const halfWidth = Math.abs(lane.widthPx) / 2;
  const laneStart = Math.min(0, lane.lengthPx);
  const laneEnd = Math.max(0, lane.lengthPx);
  const minX = hurtbox.x - Math.abs(hurtbox.halfWidth);
  const maxX = hurtbox.x + Math.abs(hurtbox.halfWidth);
  const minY = hurtbox.y - Math.abs(hurtbox.halfHeight);
  const maxY = hurtbox.y + Math.abs(hurtbox.halfHeight);
  const corners: LaneLocalPoint[] = [
    toLaneLocal(minX, minY, lane.originX, lane.originY, dirX, dirY, perpendicularX, perpendicularY),
    toLaneLocal(maxX, minY, lane.originX, lane.originY, dirX, dirY, perpendicularX, perpendicularY),
    toLaneLocal(maxX, maxY, lane.originX, lane.originY, dirX, dirY, perpendicularX, perpendicularY),
    toLaneLocal(minX, maxY, lane.originX, lane.originY, dirX, dirY, perpendicularX, perpendicularY),
  ];
  let polygon = corners;

  polygon = clipLanePolygon(polygon, 'u', laneStart, true);

  if (polygon.length === 0) {
    return null;
  }

  polygon = clipLanePolygon(polygon, 'u', laneEnd, false);

  if (polygon.length === 0) {
    return null;
  }

  polygon = clipLanePolygon(polygon, 'v', -halfWidth, true);

  if (polygon.length === 0) {
    return null;
  }

  polygon = clipLanePolygon(polygon, 'v', halfWidth, false);

  if (polygon.length === 0) {
    return null;
  }

  let entry = Number.POSITIVE_INFINITY;
  let exit = Number.NEGATIVE_INFINITY;

  for (const point of polygon) {
    entry = Math.min(entry, point.u);
    exit = Math.max(exit, point.u);
  }

  return Number.isFinite(entry) && Number.isFinite(exit) ? { entryPx: entry, exitPx: exit } : null;
}

export function getLaneEntryDistanceToAabb(lane: BeamLane, hurtbox: Hurtbox): number | null {
  return getLaneAabbContact(lane, hurtbox)?.entryPx ?? null;
}

export function resolveLaneReflection(
  lane: BeamLane,
  shield: ShieldSegment,
  hurtbox: Hurtbox,
): LaneReflection | null {
  const normalMagnitude = Math.hypot(shield.normalX, shield.normalY);

  if (!Number.isFinite(normalMagnitude) || normalMagnitude === 0) {
    return null;
  }

  const normalX = shield.normalX / normalMagnitude;
  const normalY = shield.normalY / normalMagnitude;
  const originSide = (lane.originX - shield.ax) * normalX + (lane.originY - shield.ay) * normalY;

  if (originSide <= 0) {
    return null;
  }

  const direction = getReflectionDirection(lane, normalX, normalY);

  if (direction === null) {
    return null;
  }

  const contact = getLaneSegmentContact(lane, shield.ax, shield.ay, shield.bx, shield.by);

  if (contact === null) {
    return null;
  }

  const playerEntry = getLaneEntryDistanceToAabb(lane, hurtbox);

  if (playerEntry !== null && contact.distancePx > playerEntry) {
    return null;
  }

  return {
    originX: shield.midpointX,
    originY: shield.midpointY,
    contactX: contact.x,
    contactY: contact.y,
    distancePx: contact.distancePx,
    dirX: direction.x,
    dirY: direction.y,
  };
}

interface LaneLocalPoint {
  readonly u: number;
  readonly v: number;
}

function toLaneLocal(
  x: number,
  y: number,
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  perpendicularX: number,
  perpendicularY: number,
): LaneLocalPoint {
  const deltaX = x - originX;
  const deltaY = y - originY;

  return {
    u: deltaX * dirX + deltaY * dirY,
    v: deltaX * perpendicularX + deltaY * perpendicularY,
  };
}

function clipLanePolygon(
  points: readonly LaneLocalPoint[],
  axis: 'u' | 'v',
  value: number,
  keepGreater: boolean,
): LaneLocalPoint[] {
  const output: LaneLocalPoint[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    if (current === undefined || next === undefined) {
      continue;
    }

    const currentValue = current[axis];
    const nextValue = next[axis];
    const currentInside = keepGreater ? currentValue >= value : currentValue <= value;
    const nextInside = keepGreater ? nextValue >= value : nextValue <= value;

    if (currentInside) {
      output.push(current);
    }

    if (currentInside !== nextInside) {
      const denominator = nextValue - currentValue;

      if (Math.abs(denominator) >= Number.EPSILON) {
        const t = (value - currentValue) / denominator;

        output.push({
          u: current.u + t * (next.u - current.u),
          v: current.v + t * (next.v - current.v),
        });
      }
    }
  }

  return output;
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
