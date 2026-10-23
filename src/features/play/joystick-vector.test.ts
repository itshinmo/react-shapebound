import { describe, expect, it } from 'vitest';

import { getJoystickVector } from './joystick-vector';

const ANCHOR = { x: 100, y: 100 };

describe('getJoystickVector', () => {
  it('returns zero inside the dead zone', () => {
    const result = getJoystickVector(ANCHOR, { x: 105, y: 105 });

    expect(result.vector).toEqual({ x: 0, y: 0 });
    expect(result.offset).toEqual({ x: 0, y: 0 });
  });

  it('returns a half-speed vector at half the radius', () => {
    const result = getJoystickVector(ANCHOR, { x: 128, y: 100 });

    expect(result.vector.x).toBeCloseTo(0.5);
    expect(result.vector.y).toBeCloseTo(0);
    expect(result.offset.x).toBeCloseTo(28);
    expect(result.offset.y).toBeCloseTo(0);
  });

  it('clamps the vector and knob to full speed at the radius', () => {
    const result = getJoystickVector(ANCHOR, { x: 200, y: 100 });

    expect(result.vector.x).toBeCloseTo(1);
    expect(result.vector.y).toBeCloseTo(0);
    expect(result.offset.x).toBeCloseTo(56);
    expect(result.offset.y).toBeCloseTo(0);
  });

  it('preserves direction and clamps diagonal magnitude', () => {
    const result = getJoystickVector(ANCHOR, { x: 200, y: 200 });

    expect(Math.hypot(result.vector.x, result.vector.y)).toBeCloseTo(1);
    expect(result.vector.x).toBeCloseTo(result.vector.y);
    expect(Math.hypot(result.offset.x, result.offset.y)).toBeCloseTo(56);
  });

  it('returns zero for a non-positive radius', () => {
    const result = getJoystickVector(ANCHOR, { x: 200, y: 100 }, 0);

    expect(result.vector).toEqual({ x: 0, y: 0 });
    expect(result.offset).toEqual({ x: 0, y: 0 });
  });
});
