import { describe, expect, it, vi } from 'vitest';

import {
  MAX_BLUE_POINTS,
  commitProgression,
  createEmptyProgression,
  isProgressionData,
  type BossCurrencies,
  type ProgressionCommit,
  type ProgressionData,
  type ProgressionRead,
} from './progression';
import {
  createSave,
  parseSave,
  serializeSave,
  type SaveEnvelope,
  type SaveParseResult,
} from './save';

const savedAt = '2026-10-26T12:00:00.000Z';

function createCurrencies(overrides: Partial<BossCurrencies> = {}): BossCurrencies {
  return {
    purple: 0,
    green: 0,
    orange: 0,
    ...overrides,
  };
}

function createData(overrides: Partial<ProgressionData> = {}): ProgressionData {
  return {
    ...createEmptyProgression(),
    ...overrides,
  };
}

function expectReady(commit: ProgressionCommit): Extract<ProgressionCommit, { kind: 'ready' }> {
  if (commit.kind !== 'ready') {
    throw new Error(`Expected a ready commit, received ${commit.kind}.`);
  }

  return commit;
}

function expectParsed(result: SaveParseResult<ProgressionData>): SaveEnvelope<ProgressionData> {
  if (!result.ok) {
    throw new Error(`Expected a valid parse, received ${result.reason}.`);
  }

  return result.save;
}

function commitWith(
  read: ProgressionRead,
  runPoints: number,
  deathAtMs: number,
): ProgressionCommit {
  return commitProgression(read, { runPoints, deathAtMs, savedAt });
}

describe('progression data', () => {
  it('creates the canonical zero record', () => {
    expect(createEmptyProgression()).toEqual({
      bluePoints: 0,
      bestTimeMs: 0,
      runCount: 0,
      bossCurrencies: {
        purple: 0,
        green: 0,
        orange: 0,
      },
    });
  });

  it('exports the blue-point serialization bound', () => {
    expect(MAX_BLUE_POINTS).toBe(1_000_000_000);
  });
});

describe('isProgressionData', () => {
  it('accepts the canonical empty record', () => {
    expect(isProgressionData(createEmptyProgression())).toBe(true);
  });

  it('accepts safe non-negative balances', () => {
    expect(
      isProgressionData(
        createData({
          bluePoints: 42,
          bestTimeMs: 120_000,
          runCount: 3,
          bossCurrencies: createCurrencies({ purple: 1, green: 2, orange: 3 }),
        }),
      ),
    ).toBe(true);
  });

  it('ignores extra keys in data and bossCurrencies', () => {
    expect(
      isProgressionData({
        ...createEmptyProgression(),
        extra: 'ignored',
        bossCurrencies: {
          ...createCurrencies(),
          cyan: 42,
        },
      }),
    ).toBe(true);
  });

  it('requires all four data fields', () => {
    const empty = createEmptyProgression();

    expect(
      isProgressionData({
        bestTimeMs: empty.bestTimeMs,
        runCount: empty.runCount,
        bossCurrencies: empty.bossCurrencies,
      }),
    ).toBe(false);
    expect(
      isProgressionData({
        bluePoints: empty.bluePoints,
        runCount: empty.runCount,
        bossCurrencies: empty.bossCurrencies,
      }),
    ).toBe(false);
    expect(
      isProgressionData({
        bluePoints: empty.bluePoints,
        bestTimeMs: empty.bestTimeMs,
        bossCurrencies: empty.bossCurrencies,
      }),
    ).toBe(false);
    expect(
      isProgressionData({
        bluePoints: empty.bluePoints,
        bestTimeMs: empty.bestTimeMs,
        runCount: empty.runCount,
      }),
    ).toBe(false);
  });

  it('requires all three boss currencies', () => {
    const empty = createEmptyProgression();
    const currencies = createCurrencies();

    expect(
      isProgressionData({
        ...empty,
        bossCurrencies: {
          green: currencies.green,
          orange: currencies.orange,
        },
      }),
    ).toBe(false);
    expect(
      isProgressionData({
        ...empty,
        bossCurrencies: {
          purple: currencies.purple,
          orange: currencies.orange,
        },
      }),
    ).toBe(false);
    expect(
      isProgressionData({
        ...empty,
        bossCurrencies: {
          purple: currencies.purple,
          green: currencies.green,
        },
      }),
    ).toBe(false);
  });

  it('rejects non-object data and bossCurrencies', () => {
    expect(isProgressionData(null)).toBe(false);
    expect(isProgressionData([])).toBe(false);
    expect(isProgressionData('record')).toBe(false);
    expect(isProgressionData(1)).toBe(false);
    expect(
      isProgressionData({
        ...createEmptyProgression(),
        bossCurrencies: null,
      }),
    ).toBe(false);
    expect(
      isProgressionData({
        ...createEmptyProgression(),
        bossCurrencies: [],
      }),
    ).toBe(false);
    expect(
      isProgressionData({
        ...createEmptyProgression(),
        bossCurrencies: 'none',
      }),
    ).toBe(false);
  });

  it('rejects negative, fractional, non-finite, unsafe, and non-number values', () => {
    const invalidIntegers = [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      '1',
    ];

    for (const value of invalidIntegers) {
      expect(
        isProgressionData({
          ...createEmptyProgression(),
          bluePoints: value,
        }),
      ).toBe(false);
      expect(
        isProgressionData({
          ...createEmptyProgression(),
          bestTimeMs: value,
        }),
      ).toBe(false);
      expect(
        isProgressionData({
          ...createEmptyProgression(),
          runCount: value,
        }),
      ).toBe(false);
      expect(
        isProgressionData({
          ...createEmptyProgression(),
          bossCurrencies: {
            ...createCurrencies(),
            purple: value,
          },
        }),
      ).toBe(false);
    }
  });

  it('applies the blue-point bound but no design cap to other balances', () => {
    expect(
      isProgressionData({
        ...createEmptyProgression(),
        bluePoints: MAX_BLUE_POINTS,
      }),
    ).toBe(true);
    expect(
      isProgressionData({
        ...createEmptyProgression(),
        bluePoints: MAX_BLUE_POINTS + 1,
      }),
    ).toBe(false);

    expect(
      isProgressionData({
        bluePoints: MAX_BLUE_POINTS,
        bestTimeMs: Number.MAX_SAFE_INTEGER,
        runCount: Number.MAX_SAFE_INTEGER,
        bossCurrencies: {
          purple: Number.MAX_SAFE_INTEGER,
          green: Number.MAX_SAFE_INTEGER,
          orange: Number.MAX_SAFE_INTEGER,
        },
      }),
    ).toBe(true);
  });

  it('is the validator for parseSave', () => {
    const data = createData({
      bluePoints: 12,
      bestTimeMs: 34_000,
      runCount: 2,
    });
    const result = parseSave(serializeSave(createSave(data, savedAt)), isProgressionData);

    expect(expectParsed(result)).toEqual(createSave(data, savedAt));
  });

  it('makes parseSave report invalid-data for a malformed payload', () => {
    const raw = serializeSave(createSave({ bluePoints: -1 }, savedAt));

    expect(parseSave(raw, isProgressionData)).toEqual({
      ok: false,
      reason: 'invalid-data',
    });
  });
});

describe('commitProgression', () => {
  it('commits a first run from the empty base', () => {
    const result = expectReady(commitWith({ kind: 'none' }, 120, 120_500));
    const expected = createData({
      bluePoints: 120,
      bestTimeMs: 120_500,
      runCount: 1,
    });

    expect(result.data).toEqual(expected);
    expect(result.envelope).toEqual(createSave(expected, savedAt));
    expect(result.envelope.schemaVersion).toBe(1);
  });

  it('adds run points, keeps the best time, and increments the run count', () => {
    const existing = createData({
      bluePoints: 900,
      bestTimeMs: 500_000,
      runCount: 4,
      bossCurrencies: createCurrencies({ purple: 2, green: 3, orange: 4 }),
    });
    const result = expectReady(commitWith({ kind: 'valid', data: existing }, 120, 120_000));

    expect(result.data).toEqual(
      createData({
        bluePoints: 1_020,
        bestTimeMs: 500_000,
        runCount: 5,
        bossCurrencies: createCurrencies({ purple: 2, green: 3, orange: 4 }),
      }),
    );
    expect(existing.bluePoints).toBe(900);
    expect(existing.runCount).toBe(4);
    expect(result.data.bossCurrencies).not.toBe(existing.bossCurrencies);
  });

  it('raises the best time when the death is longer than the stored record', () => {
    const existing = createData({ bestTimeMs: 60_000 });
    const result = expectReady(commitWith({ kind: 'valid', data: existing }, 5, 120_000));

    expect(result.data.bestTimeMs).toBe(120_000);
  });

  it('saturates blue points at the serialization bound', () => {
    const nearCap = createData({ bluePoints: MAX_BLUE_POINTS - 10 });
    const result = expectReady(commitWith({ kind: 'valid', data: nearCap }, 25, 25_000));

    expect(result.data.bluePoints).toBe(MAX_BLUE_POINTS);

    const overCap = expectReady(commitWith({ kind: 'none' }, MAX_BLUE_POINTS + 1, 1_000_000_000));

    expect(overCap.data.bluePoints).toBe(MAX_BLUE_POINTS);
  });

  it('counts a zero-point death and leaves the balance unchanged', () => {
    const existing = createData({
      bluePoints: 7,
      bestTimeMs: 0,
      runCount: 2,
    });
    const result = expectReady(commitWith({ kind: 'valid', data: existing }, 0, 0));

    expect(result.data).toEqual(
      createData({
        bluePoints: 7,
        bestTimeMs: 0,
        runCount: 3,
      }),
    );
  });

  it('saturates the run count at the safe-integer ceiling', () => {
    const existing = createData({ runCount: Number.MAX_SAFE_INTEGER });
    const result = expectReady(commitWith({ kind: 'valid', data: existing }, 10, 10_000));

    expect(result.data.runCount).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('copies boss currencies and writes only the canonical fields', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      savedAt,
      data: {
        bluePoints: 10,
        bestTimeMs: 1_000,
        runCount: 1,
        bossCurrencies: {
          purple: 5,
          green: 6,
          orange: 7,
          red: 999,
        },
        legacy: 'drop',
      },
    });
    const parsed = expectParsed(parseSave(raw, isProgressionData));
    const result = expectReady(
      commitProgression(
        { kind: 'valid', data: parsed.data },
        { runPoints: 10, deathAtMs: 2_000, savedAt },
      ),
    );

    expect(result.data).toEqual(
      createData({
        bluePoints: 20,
        bestTimeMs: 2_000,
        runCount: 2,
        bossCurrencies: createCurrencies({ purple: 5, green: 6, orange: 7 }),
      }),
    );
    expect(Object.keys(result.data).sort()).toEqual([
      'bestTimeMs',
      'bluePoints',
      'bossCurrencies',
      'runCount',
    ]);
    expect(Object.keys(result.data.bossCurrencies).sort()).toEqual(['green', 'orange', 'purple']);
    expect(result.envelope.data).toBe(result.data);
  });

  it('returns the unreadable outcome with no envelope', () => {
    for (const reason of [
      'invalid-json',
      'invalid-envelope',
      'unsupported-version',
      'invalid-data',
    ] as const) {
      const result = commitProgression(
        { kind: 'unreadable', reason },
        { runPoints: 100, deathAtMs: 100_000, savedAt },
      );

      expect(result).toEqual({ kind: 'unreadable', reason });
      expect(result).not.toHaveProperty('envelope');
    }
  });

  it('returns the unavailable outcome with no envelope', () => {
    const result = commitProgression(
      { kind: 'unavailable' },
      { runPoints: 100, deathAtMs: 100_000, savedAt },
    );

    expect(result).toEqual({ kind: 'unavailable' });
    expect(result).not.toHaveProperty('envelope');
  });

  it('recomputes the same envelope without double-adding', () => {
    const read: ProgressionRead = {
      kind: 'valid',
      data: createData({
        bluePoints: 100,
        runCount: 2,
      }),
    };
    const input = {
      runPoints: 50,
      deathAtMs: 50_000,
      savedAt,
    };
    const first = expectReady(commitProgression(read, input));
    const second = expectReady(commitProgression(read, input));

    expect(first.data).toEqual(second.data);
    expect(first.envelope).toEqual(second.envelope);
    expect(first.data.bluePoints).toBe(150);
    expect(read.data.bluePoints).toBe(100);
  });

  it('passes the app-supplied savedAt through unchanged', () => {
    const first = expectReady(
      commitProgression(
        { kind: 'none' },
        { runPoints: 0, deathAtMs: 0, savedAt: '2026-10-26T12:00:00.000Z' },
      ),
    );
    const second = expectReady(
      commitProgression(
        { kind: 'none' },
        { runPoints: 0, deathAtMs: 0, savedAt: '2026-10-27T12:00:00.000Z' },
      ),
    );

    expect(first.envelope.savedAt).toBe('2026-10-26T12:00:00.000Z');
    expect(second.envelope.savedAt).toBe('2026-10-27T12:00:00.000Z');
    expect(first.data).toEqual(second.data);
  });

  it('does not read a clock or randomness', () => {
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('clock read');
    });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('randomness read');
    });

    const result = commitProgression({ kind: 'none' }, { runPoints: 1, deathAtMs: 1_000, savedAt });

    dateNow.mockRestore();
    random.mockRestore();

    expect(expectReady(result).data.bluePoints).toBe(1);
  });

  it('does not read or write storage', () => {
    const getItem = vi.fn(() => {
      throw new Error('storage read');
    });
    const setItem = vi.fn(() => {
      throw new Error('storage write');
    });

    vi.stubGlobal('localStorage', { getItem, setItem });

    try {
      const result = commitProgression(
        { kind: 'none' },
        { runPoints: 1, deathAtMs: 1_000, savedAt },
      );

      expect(getItem).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
      expect(expectReady(result).data.bluePoints).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
