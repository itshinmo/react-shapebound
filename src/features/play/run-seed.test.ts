import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRunSeed } from './run-seed';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createRunSeed', () => {
  it('returns the uint32 from the browser crypto source', () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = 0xffff_ffff;
      return values;
    });

    vi.stubGlobal('crypto', { getRandomValues });

    expect(createRunSeed()).toBe(0xffff_ffff);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it('falls back to time and Math.random when crypto throws', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: () => {
        throw new Error('crypto unavailable');
      },
    });
    vi.spyOn(Date, 'now').mockReturnValue(1_234);
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    const seed = (1_234 ^ Math.floor(0.25 * 0x1_0000_0000)) >>> 0;

    expect(createRunSeed()).toBe(seed);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffff_ffff);
  });
});
