import { describe, expect, it } from 'vitest';

import {
  SHIELD_LENGTH_PX,
  SHIELD_ORBIT_GAP_PX,
  advanceReflectShield,
  createReflectShieldState,
  getRingProgress,
  getShieldSegment,
  spendReflectCharge,
} from './reflect-shield';

describe('createReflectShieldState', () => {
  it('starts full at the captured level', () => {
    const state = createReflectShieldState(3, 2_500);

    expect(state).toEqual({
      maxCharges: 3,
      charges: 3,
      rechargeMs: 2_500,
      rechargeElapsedMs: 0,
    });
  });

  it('starts with no charges at level 0', () => {
    const state = createReflectShieldState(0, 4_000);

    expect(state.maxCharges).toBe(0);
    expect(state.charges).toBe(0);
    expect(state.rechargeElapsedMs).toBe(0);
  });

  it('clamps the charge cap defensively', () => {
    expect(createReflectShieldState(9, 4_000).maxCharges).toBe(3);
    expect(createReflectShieldState(-2, 4_000).maxCharges).toBe(0);
    expect(createReflectShieldState(2.9, 4_000).maxCharges).toBe(2);
    expect(createReflectShieldState(Number.NaN, 4_000).maxCharges).toBe(0);
  });

  it('normalizes an invalid recharge duration', () => {
    expect(createReflectShieldState(1, Number.NaN).rechargeMs).toBe(4_000);
    expect(createReflectShieldState(1, 0).rechargeMs).toBe(4_000);
    expect(createReflectShieldState(1, 1_234).rechargeMs).toBe(4_000);
  });
});

describe('advanceReflectShield', () => {
  it('does nothing at full charges', () => {
    const state = createReflectShieldState(2, 4_000);

    expect(advanceReflectShield(state, 20)).toBe(state);
  });

  it('does nothing at level 0', () => {
    const state = createReflectShieldState(0, 4_000);

    expect(advanceReflectShield(state, 4_000)).toBe(state);
  });

  it('recharges one charge at the interval and carries no remainder at full', () => {
    let state = spendReflectCharge(createReflectShieldState(1, 4_000));

    state = advanceReflectShield(state, 3_999);

    expect(state.charges).toBe(0);
    expect(state.rechargeElapsedMs).toBe(3_999);

    state = advanceReflectShield(state, 1);

    expect(state.charges).toBe(1);
    expect(state.rechargeElapsedMs).toBe(0);
  });

  it('recharges one charge at a time, not all missing charges at once', () => {
    let state = createReflectShieldState(3, 4_000);

    state = spendReflectCharge(state);
    state = spendReflectCharge(state);
    state = advanceReflectShield(state, 4_000);

    expect(state.charges).toBe(2);

    state = advanceReflectShield(state, 4_000);

    expect(state.charges).toBe(3);
    expect(state.rechargeElapsedMs).toBe(0);
  });

  it('keeps the accumulator when another charge is spent', () => {
    let state = createReflectShieldState(3, 4_000);

    state = spendReflectCharge(state);
    state = spendReflectCharge(state);
    state = advanceReflectShield(state, 1_000);

    expect(state.rechargeElapsedMs).toBe(1_000);

    state = spendReflectCharge(state);
    state = advanceReflectShield(state, 3_000);

    expect(state.charges).toBe(1);
    expect(state.rechargeElapsedMs).toBe(0);
  });

  it('ignores non-positive or non-finite time', () => {
    const spent = spendReflectCharge(createReflectShieldState(1, 4_000));

    expect(advanceReflectShield(spent, 0)).toBe(spent);
    expect(advanceReflectShield(spent, -20)).toBe(spent);
    expect(advanceReflectShield(spent, Number.NaN)).toBe(spent);
  });
});

describe('spendReflectCharge', () => {
  it('spends one charge and never resets recharge progress', () => {
    let state = createReflectShieldState(2, 3_000);

    state = spendReflectCharge(state);
    state = advanceReflectShield(state, 750);
    state = spendReflectCharge(state);

    expect(state.charges).toBe(0);
    expect(state.rechargeElapsedMs).toBe(750);
  });

  it('does nothing at zero charges', () => {
    const state = createReflectShieldState(0, 4_000);

    expect(spendReflectCharge(state)).toBe(state);
  });
});

describe('getRingProgress', () => {
  it('is full at max charges', () => {
    expect(getRingProgress(createReflectShieldState(3, 4_000))).toBe(1);
  });

  it('is the recharge fraction while a charge is missing', () => {
    const spent = spendReflectCharge(createReflectShieldState(2, 4_000));
    const quarter = advanceReflectShield(spent, 1_000);

    expect(getRingProgress(spent)).toBe(0);
    expect(getRingProgress(quarter)).toBeCloseTo(0.25);
  });

  it('is full for a level-0 shield that is not rendered', () => {
    expect(getRingProgress(createReflectShieldState(0, 4_000))).toBe(1);
  });
});

describe('getShieldSegment', () => {
  it('builds a tangent 64 px segment with a midpoint 14 px outside the square', () => {
    const segment = getShieldSegment({ x: 100, y: 200 }, 64, { x: 0, y: -1 });

    expect(segment.midpointX).toBeCloseTo(100);
    expect(segment.midpointY).toBeCloseTo(200 - (64 / 2 + SHIELD_ORBIT_GAP_PX));
    expect(Math.hypot(segment.midpointX - 100, segment.midpointY - 200)).toBeCloseTo(46);
    expect(segment.ax).toBeCloseTo(100 - SHIELD_LENGTH_PX / 2);
    expect(segment.ay).toBeCloseTo(segment.midpointY);
    expect(segment.bx).toBeCloseTo(100 + SHIELD_LENGTH_PX / 2);
    expect(segment.by).toBeCloseTo(segment.midpointY);
    expect(Math.hypot(segment.bx - segment.ax, segment.by - segment.ay)).toBeCloseTo(
      SHIELD_LENGTH_PX,
    );
    expect(segment.normalX).toBe(0);
    expect(segment.normalY).toBe(-1);
  });

  it('keeps the segment perpendicular to the normal and the normal unit length', () => {
    const segment = getShieldSegment({ x: 10, y: 20 }, 32, { x: 3, y: 4 });

    expect(Math.hypot(segment.normalX, segment.normalY)).toBeCloseTo(1);
    expect(segment.normalX).toBeCloseTo(0.6);
    expect(segment.normalY).toBeCloseTo(0.8);

    const directionX = segment.bx - segment.ax;
    const directionY = segment.by - segment.ay;
    const dot = directionX * segment.normalX + directionY * segment.normalY;

    expect(dot).toBeCloseTo(0);
  });

  it('supports a custom gap and a zero normal fallback', () => {
    const segment = getShieldSegment({ x: 0, y: 0 }, 24, { x: 0, y: 0 }, 30);

    expect(segment.midpointY).toBeCloseTo(-(24 / 2 + 30));
    expect(segment.normalX).toBe(0);
    expect(segment.normalY).toBe(-1);
  });
});
