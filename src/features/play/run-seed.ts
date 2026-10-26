const UINT32_RANGE = 0x1_0000_0000;

export function createRunSeed(): number {
  try {
    const values = new Uint32Array(1);

    globalThis.crypto.getRandomValues(values);

    return values[0] ?? fallbackSeed();
  } catch {
    return fallbackSeed();
  }
}

function fallbackSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * UINT32_RANGE)) >>> 0;
}
