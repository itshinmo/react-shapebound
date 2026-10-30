import { describe, expect, it, vi } from 'vitest';

import {
  MAX_BLUE_POINTS,
  commitProgression,
  createEmptyProgression,
  isProgressionData,
  isProgressionV1Data,
  migrateProgressionV1ToV2,
  parseProgressionSave,
  purchaseUpgrade,
  resetUpgrades,
  type BossCurrencies,
  type ProgressionCommit,
  type ProgressionData,
  type ProgressionRead,
  type UpgradeChange,
} from './progression';
import { createSave, parseSave, serializeSave } from './save';
import { UPGRADE_KEYS, UPGRADE_MAX_LEVELS, type UpgradeKey, type UpgradeLevels } from './upgrades';

const savedAt = '2026-10-26T12:00:00.000Z';

function createCurrencies(overrides: Partial<BossCurrencies> = {}): BossCurrencies {
  return {
    purple: 0,
    green: 0,
    orange: 0,
    ...overrides,
  };
}

function createLevels(overrides: Partial<UpgradeLevels> = {}): UpgradeLevels {
  return {
    ...createEmptyUpgradeLevels(),
    ...overrides,
  };
}

function createEmptyUpgradeLevels(): UpgradeLevels {
  return {
    barrierCount: 0,
    movementSpeed: 0,
    playerSize: 0,
    arenaSize: 0,
    reflectCharges: 0,
    reflectChargeSpeed: 0,
    laserPierce: 0,
  };
}

function createData(overrides: Partial<ProgressionData> = {}): ProgressionData {
  return {
    ...createEmptyProgression(),
    ...overrides,
  };
}

function createV1Data(overrides: Partial<Omit<ProgressionData, 'upgrades'>> = {}) {
  return {
    bluePoints: 42,
    bestTimeMs: 120_000,
    runCount: 3,
    bossCurrencies: createCurrencies({ purple: 1, green: 2, orange: 3 }),
    ...overrides,
  };
}

function v1Envelope(data: unknown = createV1Data()): string {
  return JSON.stringify({
    schemaVersion: 1,
    savedAt,
    data,
  });
}

function expectReady(commit: ProgressionCommit): Extract<ProgressionCommit, { kind: 'ready' }> {
  if (commit.kind !== 'ready') {
    throw new Error(`Expected a ready commit, received ${commit.kind}.`);
  }

  return commit;
}

function expectChange(change: UpgradeChange): Extract<UpgradeChange, { kind: 'ready' }> {
  if (change.kind !== 'ready') {
    throw new Error(`Expected a ready change, received ${change.kind}.`);
  }

  return change;
}

function expectParsed(result: ReturnType<typeof parseProgressionSave>): ProgressionData {
  if (result.kind !== 'valid') {
    throw new Error(`Expected valid progression, received ${result.kind}.`);
  }

  return result.data;
}

function commitWith(
  read: ProgressionRead,
  runPoints: number,
  deathAtMs: number,
): ProgressionCommit {
  return commitProgression(read, { runPoints, deathAtMs, savedAt });
}

describe('progression data', () => {
  it('creates the canonical zero v2 record', () => {
    expect(createEmptyProgression()).toEqual({
      bluePoints: 0,
      bestTimeMs: 0,
      runCount: 0,
      bossCurrencies: {
        purple: 0,
        green: 0,
        orange: 0,
      },
      upgrades: {
        barrierCount: 0,
        movementSpeed: 0,
        playerSize: 0,
        arenaSize: 0,
        reflectCharges: 0,
        reflectChargeSpeed: 0,
        laserPierce: 0,
      },
    });
  });

  it('exports the blue-point serialization bound', () => {
    expect(MAX_BLUE_POINTS).toBe(1_000_000_000);
  });
});

describe('isProgressionV1Data', () => {
  it('accepts a valid four-field v1 record and ignores extras', () => {
    expect(isProgressionV1Data(createV1Data())).toBe(true);
    expect(isProgressionV1Data({ ...createV1Data(), upgrades: 'ignored', extra: true })).toBe(true);
  });

  it('rejects a missing field, a negative balance, and malformed currencies', () => {
    expect(isProgressionV1Data({ ...createV1Data(), bluePoints: undefined })).toBe(false);
    expect(isProgressionV1Data({ ...createV1Data(), bluePoints: -1 })).toBe(false);
    expect(isProgressionV1Data({ ...createV1Data(), bossCurrencies: null })).toBe(false);
    expect(isProgressionV1Data({ ...createV1Data(), bossCurrencies: [] })).toBe(false);
  });
});

describe('isProgressionData', () => {
  it('accepts the canonical empty record', () => {
    expect(isProgressionData(createEmptyProgression())).toBe(true);
  });

  it('accepts a valid v2 record with nonzero levels', () => {
    expect(
      isProgressionData(
        createData({
          bluePoints: 42,
          bestTimeMs: 120_000,
          runCount: 3,
          bossCurrencies: createCurrencies({ purple: 1, green: 2, orange: 3 }),
          upgrades: createLevels({
            barrierCount: 3,
            movementSpeed: 5,
            playerSize: 2,
            arenaSize: 4,
            reflectCharges: 1,
            reflectChargeSpeed: 3,
            laserPierce: 2,
          }),
        }),
      ),
    ).toBe(true);
  });

  it('requires all seven upgrade keys', () => {
    for (const key of UPGRADE_KEYS) {
      const upgrades: Record<string, number> = {};

      for (const other of UPGRADE_KEYS) {
        if (other !== key) {
          upgrades[other] = 0;
        }
      }

      expect(isProgressionData({ ...createEmptyProgression(), upgrades })).toBe(false);
    }
  });

  it('rejects negative, fractional, non-finite, unsafe, non-number, and above-max levels', () => {
    for (const key of UPGRADE_KEYS) {
      const invalidValues = [
        -1,
        0.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.MAX_SAFE_INTEGER + 1,
        '1',
        UPGRADE_MAX_LEVELS[key] + 1,
      ];

      for (const value of invalidValues) {
        expect(
          isProgressionData({
            ...createEmptyProgression(),
            upgrades: { ...createLevels(), [key]: value },
          }),
        ).toBe(false);
      }
    }
  });

  it('rejects null, array, and string upgrades', () => {
    for (const upgrades of [null, [], 'upgrades', 1]) {
      expect(isProgressionData({ ...createEmptyProgression(), upgrades })).toBe(false);
    }
  });

  it('accepts extra keys in data, boss currencies, and upgrades', () => {
    expect(
      isProgressionData({
        ...createEmptyProgression(),
        extra: 'ignored',
        bossCurrencies: { ...createCurrencies(), cyan: 42 },
        upgrades: { ...createLevels(), futureNode: 9 },
      }),
    ).toBe(true);
  });

  it('applies the blue-point bound but no design cap to other balances', () => {
    expect(isProgressionData({ ...createEmptyProgression(), bluePoints: MAX_BLUE_POINTS })).toBe(
      true,
    );
    expect(
      isProgressionData({ ...createEmptyProgression(), bluePoints: MAX_BLUE_POINTS + 1 }),
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
        upgrades: createLevels(),
      }),
    ).toBe(true);
  });
});

describe('migrateProgressionV1ToV2', () => {
  it('adds zero upgrades and preserves all four v1 fields', () => {
    const v1 = createV1Data();
    const data = migrateProgressionV1ToV2(v1);

    expect(data).toEqual({
      bluePoints: 42,
      bestTimeMs: 120_000,
      runCount: 3,
      bossCurrencies: { purple: 1, green: 2, orange: 3 },
      upgrades: createEmptyUpgradeLevels(),
    });
    expect(data?.bossCurrencies).not.toBe(v1.bossCurrencies);
    expect(v1).toEqual(createV1Data());
  });

  it('ignores a v1 upgrades extra and returns zero levels', () => {
    expect(
      migrateProgressionV1ToV2({ ...createV1Data(), upgrades: { barrierCount: 3 } })?.upgrades,
    ).toEqual(createEmptyUpgradeLevels());
  });

  it('returns null for invalid v1 data', () => {
    expect(migrateProgressionV1ToV2(null)).toBeNull();
    expect(migrateProgressionV1ToV2({ ...createV1Data(), bluePoints: -1 })).toBeNull();
  });
});

describe('parseProgressionSave', () => {
  it('reads a literal v1 fixture as v2 data with zero upgrades', () => {
    const data = expectParsed(parseProgressionSave(v1Envelope()));

    expect(data).toEqual({
      ...createV1Data(),
      upgrades: createEmptyUpgradeLevels(),
    });
  });

  it('reads a valid v2 envelope with nonzero upgrades', () => {
    const data = createData({
      bluePoints: 12,
      upgrades: createLevels({ movementSpeed: 4, laserPierce: 1 }),
    });

    expect(expectParsed(parseProgressionSave(serializeSave(createSave(data, savedAt))))).toEqual(
      data,
    );
  });

  it('reports invalid v1 data as unreadable instead of defaulting it', () => {
    for (const data of [
      { ...createV1Data(), bluePoints: -1 },
      { ...createV1Data(), bestTimeMs: 'long' },
      { ...createV1Data(), bossCurrencies: { purple: 0, green: 0 } },
    ]) {
      expect(parseProgressionSave(v1Envelope(data))).toEqual({
        kind: 'unreadable',
        reason: 'invalid-data',
      });
    }
  });

  it.each([0, 3, 99])('reports schema version %i as unsupported', (schemaVersion) => {
    expect(
      parseProgressionSave(JSON.stringify({ schemaVersion, savedAt, data: createV1Data() })),
    ).toEqual({ kind: 'unreadable', reason: 'unsupported-version' });
  });

  it('rejects a v1 envelope through the bare parser without a migration', () => {
    expect(parseSave(v1Envelope(), isProgressionData)).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
  });

  it('drops v1 extra keys from the migrated in-memory record', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      savedAt,
      data: { ...createV1Data(), legacy: 'drop' },
    });

    expect(Object.keys(expectParsed(parseProgressionSave(raw))).sort()).toEqual([
      'bestTimeMs',
      'bluePoints',
      'bossCurrencies',
      'runCount',
      'upgrades',
    ]);
  });
});

describe('commitProgression', () => {
  it('commits a first run from the empty base with zero upgrades', () => {
    const result = expectReady(commitWith({ kind: 'none' }, 120, 120_500));
    const expected = createData({
      bluePoints: 120,
      bestTimeMs: 120_500,
      runCount: 1,
    });

    expect(result.data).toEqual(expected);
    expect(result.envelope).toEqual(createSave(expected, savedAt));
    expect(result.envelope.schemaVersion).toBe(2);
  });

  it('adds run points, keeps the best time, increments the run count, and preserves upgrades', () => {
    const upgrades = createLevels({
      barrierCount: 2,
      movementSpeed: 3,
      playerSize: 4,
      arenaSize: 1,
      reflectCharges: 2,
      reflectChargeSpeed: 4,
      laserPierce: 1,
    });
    const existing = createData({
      bluePoints: 900,
      bestTimeMs: 500_000,
      runCount: 4,
      bossCurrencies: createCurrencies({ purple: 2, green: 3, orange: 4 }),
      upgrades,
    });
    const result = expectReady(commitWith({ kind: 'valid', data: existing }, 120, 120_000));

    expect(result.data).toEqual(
      createData({
        bluePoints: 1_020,
        bestTimeMs: 500_000,
        runCount: 5,
        bossCurrencies: createCurrencies({ purple: 2, green: 3, orange: 4 }),
        upgrades,
      }),
    );
    expect(result.data.upgrades).not.toBe(existing.upgrades);
    expect(existing.bluePoints).toBe(900);
    expect(existing.runCount).toBe(4);
    expect(result.data.bossCurrencies).not.toBe(existing.bossCurrencies);
  });

  it('preserves base fields and writes zero upgrades from a migrated v1 record', () => {
    const migrated = expectParsed(parseProgressionSave(v1Envelope()));
    const result = expectReady(commitWith({ kind: 'valid', data: migrated }, 1, 200_000));

    expect(result.data).toEqual({
      bluePoints: 43,
      bestTimeMs: 200_000,
      runCount: 4,
      bossCurrencies: { purple: 1, green: 2, orange: 3 },
      upgrades: createEmptyUpgradeLevels(),
    });
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

  it('writes only the canonical data and upgrade keys', () => {
    const raw = JSON.stringify({
      schemaVersion: 2,
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
        upgrades: {
          ...createLevels({ barrierCount: 1 }),
          futureNode: 9,
        },
        legacy: 'drop',
      },
    });
    const parsed = expectParsed(parseProgressionSave(raw));
    const result = expectReady(
      commitProgression(
        { kind: 'valid', data: parsed },
        { runPoints: 10, deathAtMs: 2_000, savedAt },
      ),
    );

    expect(result.data).toEqual(
      createData({
        bluePoints: 20,
        bestTimeMs: 2_000,
        runCount: 2,
        bossCurrencies: createCurrencies({ purple: 5, green: 6, orange: 7 }),
        upgrades: createLevels({ barrierCount: 1 }),
      }),
    );
    expect(Object.keys(result.data).sort()).toEqual([
      'bestTimeMs',
      'bluePoints',
      'bossCurrencies',
      'runCount',
      'upgrades',
    ]);
    expect(Object.keys(result.data.bossCurrencies).sort()).toEqual(['green', 'orange', 'purple']);
    expect(Object.keys(result.data.upgrades).sort()).toEqual([...UPGRADE_KEYS].sort());
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

  it('recomputes the same envelope without double-adding and without mutation', () => {
    const read: ProgressionRead = {
      kind: 'valid',
      data: createData({
        bluePoints: 100,
        runCount: 2,
        upgrades: createLevels({ movementSpeed: 2 }),
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
    expect(read.data.upgrades.movementSpeed).toBe(2);
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

  it('does not read a clock, randomness, or storage', () => {
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('clock read');
    });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('randomness read');
    });
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
      dateNow.mockRestore();
      random.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});

describe('purchaseUpgrade', () => {
  it('adds one level, subtracts one point, and preserves everything else', () => {
    const upgrades = createLevels({ barrierCount: 1, movementSpeed: 2, laserPierce: 1 });
    const existing = createData({
      bluePoints: 10,
      bestTimeMs: 9_000,
      runCount: 4,
      bossCurrencies: createCurrencies({ purple: 3, green: 2, orange: 1 }),
      upgrades,
    });
    const result = expectChange(
      purchaseUpgrade({ kind: 'valid', data: existing }, 'movementSpeed', savedAt),
    );

    expect(result.data).toEqual(
      createData({
        bluePoints: 9,
        bestTimeMs: 9_000,
        runCount: 4,
        bossCurrencies: createCurrencies({ purple: 3, green: 2, orange: 1 }),
        upgrades: createLevels({ barrierCount: 1, movementSpeed: 3, laserPierce: 1 }),
      }),
    );
    expect(result.envelope.data).toBe(result.data);
    expect(result.envelope.schemaVersion).toBe(2);
    expect(existing.bluePoints).toBe(10);
    expect(existing.upgrades).toEqual(upgrades);
  });

  it('purchases from a missing save only when the base has points', () => {
    expect(purchaseUpgrade({ kind: 'none' }, 'barrierCount', savedAt)).toEqual({
      kind: 'insufficient-points',
    });

    const funded = expectChange(
      purchaseUpgrade(
        { kind: 'valid', data: createData({ bluePoints: 1 }) },
        'barrierCount',
        savedAt,
      ),
    );

    expect(funded.data.bluePoints).toBe(0);
    expect(funded.data.upgrades).toEqual(createLevels({ barrierCount: 1 }));
  });

  it('is blocked at max level with no envelope', () => {
    const existing = createData({
      bluePoints: 10,
      upgrades: createLevels({ barrierCount: 3 }),
    });

    expect(purchaseUpgrade({ kind: 'valid', data: existing }, 'barrierCount', savedAt)).toEqual({
      kind: 'max-level',
    });
  });

  it('is blocked with zero points, no envelope', () => {
    expect(purchaseUpgrade({ kind: 'valid', data: createData() }, 'playerSize', savedAt)).toEqual({
      kind: 'insufficient-points',
    });
  });

  it('is locked for an unknown key with no envelope', () => {
    expect(
      purchaseUpgrade(
        { kind: 'valid', data: createData({ bluePoints: 10 }) },
        'mysteryNode' as UpgradeKey,
        savedAt,
      ),
    ).toEqual({ kind: 'locked' });
  });

  it('returns the unreadable and unavailable outcomes with no envelope', () => {
    expect(
      purchaseUpgrade({ kind: 'unreadable', reason: 'invalid-data' }, 'barrierCount', savedAt),
    ).toEqual({ kind: 'unreadable', reason: 'invalid-data' });
    expect(purchaseUpgrade({ kind: 'unavailable' }, 'barrierCount', savedAt)).toEqual({
      kind: 'unavailable',
    });
  });

  it('is add-only and never mutates its input or reads a clock, randomness, or storage', () => {
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('clock read');
    });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('randomness read');
    });
    const getItem = vi.fn(() => {
      throw new Error('storage read');
    });
    const setItem = vi.fn(() => {
      throw new Error('storage write');
    });

    vi.stubGlobal('localStorage', { getItem, setItem });

    const existing = createData({ bluePoints: 5 });
    const result = expectChange(
      purchaseUpgrade({ kind: 'valid', data: existing }, 'arenaSize', savedAt),
    );

    expect(result.data.upgrades.arenaSize).toBe(1);
    expect(existing.upgrades.arenaSize).toBe(0);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();

    dateNow.mockRestore();
    random.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe('resetUpgrades', () => {
  it('returns no-upgrades for an all-zero tree with no envelope', () => {
    expect(resetUpgrades({ kind: 'none' }, savedAt)).toEqual({ kind: 'no-upgrades' });
    expect(resetUpgrades({ kind: 'valid', data: createData({ bluePoints: 10 }) }, savedAt)).toEqual(
      { kind: 'no-upgrades' },
    );
  });

  it('clears one purchased level and refunds one point', () => {
    const existing = createData({
      bluePoints: 9,
      upgrades: createLevels({ barrierCount: 1 }),
    });
    const result = expectChange(resetUpgrades({ kind: 'valid', data: existing }, savedAt));

    expect(result.data.bluePoints).toBe(10);
    expect(result.data.upgrades).toEqual(createEmptyUpgradeLevels());
    expect(result.envelope.data).toBe(result.data);
  });

  it('clears all seven levels, refunds their sum, and preserves base fields', () => {
    const existing = createData({
      bluePoints: 4,
      bestTimeMs: 321_000,
      runCount: 8,
      bossCurrencies: createCurrencies({ purple: 2, green: 4, orange: 6 }),
      upgrades: createLevels({
        barrierCount: 2,
        movementSpeed: 3,
        playerSize: 1,
        arenaSize: 5,
        reflectCharges: 2,
        reflectChargeSpeed: 4,
        laserPierce: 2,
      }),
    });
    const result = expectChange(resetUpgrades({ kind: 'valid', data: existing }, savedAt));

    expect(result.data).toEqual(
      createData({
        bluePoints: 23,
        bestTimeMs: 321_000,
        runCount: 8,
        bossCurrencies: createCurrencies({ purple: 2, green: 4, orange: 6 }),
        upgrades: createEmptyUpgradeLevels(),
      }),
    );
    expect(existing.bluePoints).toBe(4);
    expect(existing.upgrades.movementSpeed).toBe(3);
  });

  it('stays at the blue-point cap and discards the excess refund', () => {
    const existing = createData({
      bluePoints: MAX_BLUE_POINTS,
      upgrades: createLevels({ barrierCount: 2, laserPierce: 1 }),
    });
    const result = expectChange(resetUpgrades({ kind: 'valid', data: existing }, savedAt));

    expect(result.data.bluePoints).toBe(MAX_BLUE_POINTS);
    expect(result.data.upgrades).toEqual(createEmptyUpgradeLevels());
  });

  it('returns the unreadable and unavailable outcomes with no envelope', () => {
    expect(resetUpgrades({ kind: 'unreadable', reason: 'invalid-json' }, savedAt)).toEqual({
      kind: 'unreadable',
      reason: 'invalid-json',
    });
    expect(resetUpgrades({ kind: 'unavailable' }, savedAt)).toEqual({ kind: 'unavailable' });
  });

  it('does not mutate its input or read a clock, randomness, or storage', () => {
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('clock read');
    });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('randomness read');
    });
    const getItem = vi.fn(() => {
      throw new Error('storage read');
    });
    const setItem = vi.fn(() => {
      throw new Error('storage write');
    });

    vi.stubGlobal('localStorage', { getItem, setItem });

    const existing = createData({
      bluePoints: 0,
      upgrades: createLevels({ reflectChargeSpeed: 2 }),
    });
    const result = expectChange(resetUpgrades({ kind: 'valid', data: existing }, savedAt));

    expect(result.data.bluePoints).toBe(2);
    expect(existing.upgrades.reflectChargeSpeed).toBe(2);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();

    dateNow.mockRestore();
    random.mockRestore();
    vi.unstubAllGlobals();
  });

  it('returns one v2 envelope', () => {
    const result = expectChange(
      resetUpgrades(
        { kind: 'valid', data: createData({ upgrades: createLevels({ playerSize: 1 }) }) },
        savedAt,
      ),
    );

    expect(result.envelope).toEqual(createSave(result.data, savedAt));
    expect(result.envelope.schemaVersion).toBe(2);
  });
});
