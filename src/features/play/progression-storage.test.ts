import { describe, expect, it, vi } from 'vitest';

import { createEmptyProgression, type ProgressionData } from '@/game/progression';
import { SAVE_STORAGE_KEY, createSave, serializeSave } from '@/game/save';
import type { StorageLike } from '@/shared/lib/storage';

import {
  clearProgression,
  createProgressionStorage,
  readProgression,
  writeProgression,
} from './progression-storage';

const savedAt = '2026-10-26T12:00:00.000Z';
const OTHER_KEY = 'shapebound:settings';

const ZERO_UPGRADES = {
  barrierCount: 0,
  movementSpeed: 0,
  playerSize: 0,
  arenaSize: 0,
  reflectCharges: 0,
  reflectChargeSpeed: 0,
  laserPierce: 0,
};

function v1Raw(
  overrides: Partial<{
    bluePoints: number;
    bestTimeMs: number;
    runCount: number;
    bossCurrencies: unknown;
  }> = {},
): string {
  return JSON.stringify({
    schemaVersion: 1,
    savedAt,
    data: {
      bluePoints: 42,
      bestTimeMs: 120_000,
      runCount: 3,
      bossCurrencies: { purple: 1, green: 2, orange: 3 },
      ...overrides,
    },
  });
}

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('readProgression', () => {
  it('reports none for an absent save key', () => {
    const storage = new MemoryStorage();

    expect(readProgression(storage)).toEqual({ kind: 'none' });
  });

  it('migrates a literal v1 envelope to v2 data with zero upgrades without writing', () => {
    const storage = new MemoryStorage();

    storage.setItem(SAVE_STORAGE_KEY, v1Raw());

    const setItem = vi.spyOn(storage, 'setItem');
    const read = readProgression(storage);

    expect(read).toEqual({
      kind: 'valid',
      data: {
        bluePoints: 42,
        bestTimeMs: 120_000,
        runCount: 3,
        bossCurrencies: { purple: 1, green: 2, orange: 3 },
        upgrades: ZERO_UPGRADES,
      },
    });
    expect(setItem).not.toHaveBeenCalled();
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(v1Raw());
  });

  it('returns validated v2 data with nonzero upgrades', () => {
    const storage = new MemoryStorage();
    const data: ProgressionData = {
      ...createEmptyProgression(),
      bluePoints: 7,
      bestTimeMs: 33_000,
      runCount: 2,
      upgrades: {
        ...ZERO_UPGRADES,
        barrierCount: 2,
        movementSpeed: 4,
      },
    };

    storage.setItem(SAVE_STORAGE_KEY, serializeSave(createSave(data, savedAt)));

    expect(readProgression(storage)).toEqual({ kind: 'valid', data });
  });

  it('reports invalid JSON as unreadable', () => {
    const storage = new MemoryStorage();

    storage.setItem(SAVE_STORAGE_KEY, '{not json');

    expect(readProgression(storage)).toEqual({
      kind: 'unreadable',
      reason: 'invalid-json',
    });
  });

  it('reports an invalid envelope as unreadable', () => {
    const storage = new MemoryStorage();

    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ schemaVersion: 1 }));

    expect(readProgression(storage)).toEqual({
      kind: 'unreadable',
      reason: 'invalid-envelope',
    });
  });

  it('reports an unsupported schema version as unreadable', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      SAVE_STORAGE_KEY,
      serializeSave({
        ...createSave(createEmptyProgression(), savedAt),
        schemaVersion: 3,
      }),
    );

    expect(readProgression(storage)).toEqual({
      kind: 'unreadable',
      reason: 'unsupported-version',
    });
  });

  it('accepts schema 2 as the current version', () => {
    const storage = new MemoryStorage();
    const envelope = createSave(createEmptyProgression(), savedAt);

    storage.setItem(SAVE_STORAGE_KEY, serializeSave(envelope));

    expect(readProgression(storage)).toEqual({ kind: 'valid', data: envelope.data });
  });

  it('reports invalid v1 data as unreadable instead of defaulting it', () => {
    const storage = new MemoryStorage();

    storage.setItem(SAVE_STORAGE_KEY, v1Raw({ bluePoints: -1 }));

    expect(readProgression(storage)).toEqual({
      kind: 'unreadable',
      reason: 'invalid-data',
    });
  });

  it('reports invalid v2 upgrade data as unreadable', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        savedAt,
        data: {
          ...createEmptyProgression(),
          upgrades: { ...ZERO_UPGRADES, barrierCount: 99 },
        },
      }),
    );

    expect(readProgression(storage)).toEqual({
      kind: 'unreadable',
      reason: 'invalid-data',
    });
  });

  it('accepts v2 extra keys on read and drops them on the next canonical write', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        savedAt,
        data: {
          ...createEmptyProgression(),
          bluePoints: 6,
          bestTimeMs: 7_000,
          runCount: 1,
          legacy: 'ignored',
          bossCurrencies: { purple: 1, green: 2, orange: 3, cyan: 4 },
          upgrades: { ...ZERO_UPGRADES, futureNode: 9 },
        },
      }),
    );

    const read = readProgression(storage);

    expect(read.kind).toBe('valid');

    if (read.kind !== 'valid') {
      return;
    }

    expect(read.data.bluePoints).toBe(6);
    expect((read.data as unknown as Record<string, unknown>)['legacy']).toBe('ignored');

    const canonical = createEmptyProgression();
    const envelope = createSave(canonical, savedAt);

    expect(writeProgression(storage, envelope)).toBe(true);

    const stored = storage.getItem(SAVE_STORAGE_KEY);

    expect(stored).toBe(serializeSave(envelope));
    expect(stored).not.toContain('legacy');
    expect(stored).not.toContain('futureNode');
  });

  it('reports unavailable when the storage read throws', () => {
    const storage = new MemoryStorage();

    storage.getItem = () => {
      throw new Error('blocked');
    };

    expect(readProgression(storage)).toEqual({ kind: 'unavailable' });
  });

  it('reports unavailable when storage is null', () => {
    expect(readProgression(null)).toEqual({ kind: 'unavailable' });
  });
});

describe('writeProgression', () => {
  it('writes the exact envelope and reports success', () => {
    const storage = new MemoryStorage();
    const envelope = createSave(createEmptyProgression(), savedAt);

    expect(writeProgression(storage, envelope)).toBe(true);
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(serializeSave(envelope));
  });

  it('reports failure when the storage write throws and leaves the bytes unchanged', () => {
    const storage = new MemoryStorage();
    const previous = v1Raw();

    storage.setItem(SAVE_STORAGE_KEY, previous);
    storage.setItem = () => {
      throw new Error('quota exceeded');
    };

    expect(writeProgression(storage, createSave(createEmptyProgression(), savedAt))).toBe(false);
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(previous);
  });

  it('reports failure when storage is null', () => {
    expect(writeProgression(null, createSave(createEmptyProgression(), savedAt))).toBe(false);
  });
});

describe('clearProgression', () => {
  it('removes only the save key', () => {
    const storage = new MemoryStorage();

    storage.setItem(SAVE_STORAGE_KEY, '{}');
    storage.setItem(OTHER_KEY, '{}');

    clearProgression(storage);

    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(OTHER_KEY)).toBe('{}');
  });

  it('swallows an unavailable storage API', () => {
    const storage = new MemoryStorage();

    storage.removeItem = () => {
      throw new Error('blocked');
    };

    expect(() => {
      clearProgression(storage);
    }).not.toThrow();
    expect(() => {
      clearProgression(null);
    }).not.toThrow();
  });
});

describe('createProgressionStorage', () => {
  it('delegates read, write, and clear to the supplied storage', () => {
    const storage = new MemoryStorage();
    const port = createProgressionStorage(storage);

    expect(port.read()).toEqual({ kind: 'none' });

    const data: ProgressionData = {
      ...createEmptyProgression(),
      bluePoints: 11,
      bestTimeMs: 22_000,
      runCount: 1,
      upgrades: { ...ZERO_UPGRADES, arenaSize: 2 },
    };
    const envelope = createSave(data, savedAt);

    expect(port.write(envelope)).toBe(true);
    expect(port.read()).toEqual({ kind: 'valid', data });

    port.clear();

    expect(port.read()).toEqual({ kind: 'none' });
  });
});
