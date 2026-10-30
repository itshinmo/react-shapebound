import { describe, expect, it } from 'vitest';

import {
  getEnemyHitHalf,
  getLaneEntryDistanceToAabb,
  getLaneSegmentContact,
  getReflectionDirection,
  laneOverlapsHurtbox,
  pickEarliestContact,
  resolveLaneReflection,
  sweptRedContact,
  type BeamLane,
  type Hurtbox,
} from './enemy-collision';
import { getShieldSegment } from './reflect-shield';

const HURTBOX: Hurtbox = { x: 100, y: 100, halfWidth: 25.6, halfHeight: 25.6 };

function lane(overrides: Partial<BeamLane> = {}): BeamLane {
  return {
    originX: 100,
    originY: 100,
    dirX: 1,
    dirY: 0,
    widthPx: 60,
    lengthPx: 200,
    ...overrides,
  };
}

describe('getEnemyHitHalf', () => {
  it('uses an axis-aligned 80% hitbox', () => {
    expect(getEnemyHitHalf(32)).toBeCloseTo(12.8);
    expect(getEnemyHitHalf(40)).toBeCloseTo(16);
  });
});

describe('sweptRedContact', () => {
  it('returns the swept entry time at the capped 224 px/s step', () => {
    const contact = sweptRedContact(58, 100, 62.48, 100, 32, HURTBOX);

    expect(contact).not.toBeNull();
    expect(contact).toBeCloseTo(3.6 / 4.48);
  });

  it('catches a segment that crosses the whole expanded hurtbox in one step', () => {
    const contact = sweptRedContact(0, 100, 200, 100, 32, HURTBOX);

    expect(contact).toBeCloseTo(61.6 / 200);
  });

  it('returns zero when the previous center already overlaps', () => {
    expect(sweptRedContact(100, 100, 104.48, 100, 32, HURTBOX)).toBe(0);
    expect(sweptRedContact(62, 100, 50, 100, 32, HURTBOX)).toBe(0);
  });

  it('returns null for a miss', () => {
    expect(sweptRedContact(0, 300, 200, 300, 32, HURTBOX)).toBeNull();
    expect(sweptRedContact(0, 100, 50, 100, 32, HURTBOX)).toBeNull();
  });

  it('returns null when the segment moves away from the hurtbox', () => {
    expect(sweptRedContact(0, 100, -10, 100, 32, HURTBOX)).toBeNull();
  });

  it('handles a zero-length segment', () => {
    expect(sweptRedContact(100, 100, 100, 100, 32, HURTBOX)).toBe(0);
    expect(sweptRedContact(0, 0, 0, 0, 32, HURTBOX)).toBeNull();
  });
});

describe('laneOverlapsHurtbox', () => {
  it('detects a horizontal lane through the hurtbox', () => {
    expect(laneOverlapsHurtbox(lane(), HURTBOX)).toBe(true);
  });

  it('detects a rotated lane through the hurtbox', () => {
    const diagonal = lane({
      originX: 0,
      originY: 0,
      dirX: 1 / Math.sqrt(2),
      dirY: 1 / Math.sqrt(2),
      widthPx: 60,
      lengthPx: 200,
    });

    expect(laneOverlapsHurtbox(diagonal, { x: 50, y: 50, halfWidth: 25.6, halfHeight: 25.6 })).toBe(
      true,
    );
  });

  it('treats a touching edge as overlap', () => {
    expect(laneOverlapsHurtbox(lane(), { x: 200, y: 155, halfWidth: 25.6, halfHeight: 25.6 })).toBe(
      true,
    );
    expect(
      laneOverlapsHurtbox(lane(), { x: 200, y: 155.7, halfWidth: 25.6, halfHeight: 25.6 }),
    ).toBe(false);
  });

  it('misses when the hurtbox is outside the lane width', () => {
    expect(
      laneOverlapsHurtbox(lane(), { x: 200, y: 44.3, halfWidth: 25.6, halfHeight: 25.6 }),
    ).toBe(false);
  });

  it('misses behind the lane origin and beyond its length', () => {
    expect(laneOverlapsHurtbox(lane(), { x: 0, y: 100, halfWidth: 25.6, halfHeight: 25.6 })).toBe(
      false,
    );
    expect(laneOverlapsHurtbox(lane(), { x: 400, y: 100, halfWidth: 25.6, halfHeight: 25.6 })).toBe(
      false,
    );
  });

  it('rejects a zero-direction lane', () => {
    expect(laneOverlapsHurtbox(lane({ dirX: 0, dirY: 0 }), HURTBOX)).toBe(false);
  });
});

describe('reflect shield contact and first hit', () => {
  const LANE: BeamLane = {
    originX: 400,
    originY: 380,
    dirX: 0,
    dirY: -1,
    widthPx: 57.6,
    lengthPx: 444,
  };
  const SHIELD = getShieldSegment({ x: 400, y: 300 }, 64, { x: 0, y: 1 });
  const PLAYER = { x: 400, y: 300, halfWidth: 25.6, halfHeight: 25.6 };

  it('finds the centerline contact point on the shield', () => {
    const contact = getLaneSegmentContact(LANE, SHIELD.ax, SHIELD.ay, SHIELD.bx, SHIELD.by);

    expect(contact).not.toBeNull();
    expect(contact?.x).toBeCloseTo(400);
    expect(contact?.y).toBeCloseTo(346);
    expect(contact?.distancePx).toBeCloseTo(34);
  });

  it('finds the player lane entry distance', () => {
    expect(getLaneEntryDistanceToAabb(LANE, PLAYER)).toBeCloseTo(54.4);
  });

  it('reflects when the outer shield face is hit before the player', () => {
    expect(resolveLaneReflection(LANE, SHIELD, PLAYER)).toMatchObject({
      originX: 400,
      originY: 346,
      contactX: 400,
      contactY: 346,
      distancePx: 34,
      dirX: 0,
      dirY: 1,
    });
  });

  it('does not reflect from the inner side', () => {
    const inner = getShieldSegment({ x: 400, y: 300 }, 64, { x: 0, y: -1 });

    expect(resolveLaneReflection(LANE, inner, PLAYER)).toBeNull();
  });

  it('does not reflect when the player is hit first', () => {
    const lane: BeamLane = {
      originX: 100,
      originY: 300,
      dirX: 1,
      dirY: 0,
      widthPx: 12,
      lengthPx: 800,
    };
    const shieldBehindPlayer = {
      ax: 450,
      ay: 280,
      bx: 450,
      by: 320,
      midpointX: 450,
      midpointY: 300,
      normalX: -1,
      normalY: 0,
    };

    expect(resolveLaneReflection(lane, shieldBehindPlayer, PLAYER)).toBeNull();
  });

  it('reflects when an angled shield enters the lane before its centerline', () => {
    const lane: BeamLane = {
      originX: -200,
      originY: -45,
      dirX: 1,
      dirY: 0,
      widthPx: 57.6,
      lengthPx: 1_000,
    };
    const shield = {
      ax: 413.612,
      ay: -61,
      bx: 358.188,
      by: -29,
      midpointX: 385.9,
      midpointY: -45,
      normalX: -0.5,
      normalY: -0.866,
    };
    const contact = getLaneSegmentContact(lane, shield.ax, shield.ay, shield.bx, shield.by);
    const playerNearEdge = { x: 400, y: 0, halfWidth: 25.6, halfHeight: 25.6 };

    expect(contact?.x).toBeCloseTo(358.2, 0);
    expect(contact?.distancePx).toBeCloseTo(558.2, 0);
    expect(resolveLaneReflection(lane, shield, playerNearEdge)).toMatchObject({
      originX: 385.9,
      originY: -45,
    });
    expect(resolveLaneReflection(lane, shield, playerNearEdge)?.contactX).toBeCloseTo(358.2, 0);
  });

  it('reflects a tie at the player contact distance', () => {
    const lane: BeamLane = {
      originX: 100,
      originY: 300,
      dirX: 1,
      dirY: 0,
      widthPx: 12,
      lengthPx: 800,
    };
    const shieldAtPlayerEntry = {
      ax: 374.4,
      ay: 280,
      bx: 374.4,
      by: 320,
      midpointX: 374.4,
      midpointY: 300,
      normalX: -1,
      normalY: 0,
    };

    expect(resolveLaneReflection(lane, shieldAtPlayerEntry, PLAYER)).not.toBeNull();
  });
});

describe('pickEarliestContact', () => {
  it('returns null for no candidates', () => {
    expect(pickEarliestContact([])).toBeNull();
  });

  it('picks the lowest contact time', () => {
    const first = { slotId: 3, contactTime: 0.8 };
    const second = { slotId: 1, contactTime: 0.55 };

    expect(pickEarliestContact([first, second])).toBe(second);
  });

  it('breaks a contact-time tie with the lower slot id', () => {
    const first = { slotId: 7, contactTime: 1 };
    const second = { slotId: 2, contactTime: 1 };

    expect(pickEarliestContact([first, second])).toBe(second);
  });

  it('preserves the extra fields on the chosen candidate', () => {
    const candidate = { slotId: 2, contactTime: 0.4, kind: 'red-square' };

    expect(pickEarliestContact([candidate])).toBe(candidate);
  });
});

describe('getReflectionDirection', () => {
  it('reflects a perpendicular beam back along the normal', () => {
    expect(
      getReflectionDirection(lane({ originX: 0, originY: 0, dirX: 0, dirY: -1 }), 0, -1),
    ).toEqual({ x: 0, y: 1 });
  });

  it('normalizes a non-unit lane and normal', () => {
    const direction = getReflectionDirection(
      lane({ originX: 0, originY: 0, dirX: 0, dirY: -5 }),
      0,
      -3,
    );

    expect(direction?.x).toBeCloseTo(0);
    expect(direction?.y).toBeCloseTo(1);
  });

  it('rejects a grazing beam at or below the epsilon', () => {
    expect(
      getReflectionDirection(lane({ originX: 0, originY: 0, dirX: 1, dirY: 0 }), 0, 1),
    ).toBeNull();

    const justBelow = Math.sqrt(1 - 0.34 * 0.34);
    expect(
      getReflectionDirection(lane({ originX: 0, originY: 0, dirX: justBelow, dirY: 0.34 }), 0, 1),
    ).toBeNull();

    const atEpsilon = Math.sqrt(1 - 0.35 * 0.35);
    expect(
      getReflectionDirection(lane({ originX: 0, originY: 0, dirX: atEpsilon, dirY: 0.35 }), 0, 1),
    ).not.toBeNull();
  });

  it('rejects a zero direction or zero normal', () => {
    expect(
      getReflectionDirection(lane({ originX: 0, originY: 0, dirX: 0, dirY: 0 }), 0, 1),
    ).toBeNull();
    expect(
      getReflectionDirection(lane({ originX: 0, originY: 0, dirX: 0, dirY: 1 }), 0, 0),
    ).toBeNull();
  });
});
