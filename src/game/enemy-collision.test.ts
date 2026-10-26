import { describe, expect, it } from 'vitest';

import {
  getEnemyHitHalf,
  laneOverlapsHurtbox,
  pickEarliestContact,
  sweptRedContact,
  type BeamLane,
  type Hurtbox,
} from './enemy-collision';

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
