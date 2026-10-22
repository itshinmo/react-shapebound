export interface Rng {
  next(): number;
  nextInt(maxExclusive: number): number;
  getState(): number;
}

// mulberry32: small, fast, deterministic, and not suitable for cryptography.
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    nextInt(maxExclusive: number): number {
      if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError('nextInt requires a positive safe integer bound.');
      }

      return Math.floor(next() * maxExclusive);
    },
    getState(): number {
      return state;
    },
  };
}
