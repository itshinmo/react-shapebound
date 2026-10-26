import { describe, expect, it } from 'vitest';

import { createEmptyProgression } from '@/game/progression';
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

  it('returns validated data for a valid v1 envelope', () => {
    const storage = new MemoryStorage();
    const data = {
      ...createEmptyProgression(),
      bluePoints: 42,
      bestTimeMs: 120_000,
      runCount: 3,
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
        schemaVersion: 2,
      }),
    );

    expect(readProgression(storage)).toEqual({
      kind: 'unreadable',
      reason: 'unsupported-version',
    });
  });

  it('reports invalid data as unreadable', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt,
        data: {
          bluePoints: -1,
          bestTimeMs: 0,
          runCount: 0,
          bossCurrencies: { purple: 0, green: 0, orange: 0 },
        },
      }),
    );

    expect(readProgression(storage)).toEqual({
      kind: 'unreadable',
      reason: 'invalid-data',
    });
  });

  it('accepts extra keys in data and boss currencies', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt,
        data: {
          bluePoints: 6,
          bestTimeMs: 7_000,
          runCount: 1,
          bossCurrencies: { purple: 1, green: 2, orange: 3, cyan: 4 },
          legacy: 'ignored',
        },
      }),
    );

    const read = readProgression(storage);

    expect(read).toEqual({
      kind: 'valid',
      data: {
        bluePoints: 6,
        bestTimeMs: 7_000,
        runCount: 1,
        bossCurrencies: { purple: 1, green: 2, orange: 3, cyan: 4 },
        legacy: 'ignored',
      },
    });
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

  it('reports failure when the storage write throws', () => {
    const storage = new MemoryStorage();

    storage.setItem = () => {
      throw new Error('quota exceeded');
    };

    expect(writeProgression(storage, createSave(createEmptyProgression(), savedAt))).toBe(false);
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

    const data = {
      ...createEmptyProgression(),
      bluePoints: 11,
      bestTimeMs: 22_000,
      runCount: 1,
    };
    const envelope = createSave(data, savedAt);

    expect(port.write(envelope)).toBe(true);
    expect(port.read()).toEqual({ kind: 'valid', data });

    port.clear();

    expect(port.read()).toEqual({ kind: 'none' });
  });
});
