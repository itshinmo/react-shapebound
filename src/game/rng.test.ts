import { describe, expect, it } from 'vitest';

import { createRng } from './rng';

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const first = createRng(1234);
    const second = createRng(1234);

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });

  it('produces different streams for different seeds', () => {
    const first = createRng(1);
    const second = createRng(2);

    expect(first.next()).not.toBe(second.next());
  });

  it('keeps next() in the unit interval', () => {
    const rng = createRng(42);

    for (let index = 0; index < 100; index += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps nextInt() inside the requested bound', () => {
    const rng = createRng(7);

    for (let index = 0; index < 100; index += 1) {
      const value = rng.nextInt(6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });

  it('advances its state after a draw', () => {
    const rng = createRng(99);
    const before = rng.getState();
    rng.next();

    expect(rng.getState()).not.toBe(before);
  });

  it('rejects invalid integer bounds', () => {
    const rng = createRng(1);

    expect(() => rng.nextInt(0)).toThrow(RangeError);
    expect(() => rng.nextInt(-1)).toThrow(RangeError);
    expect(() => rng.nextInt(1.5)).toThrow(RangeError);
  });
});
