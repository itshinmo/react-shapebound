import { describe, expect, it } from 'vitest';

import { readJson, removeStorage, writeJson } from './storage';

import type { StorageLike } from './storage';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

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

describe('storage helpers', () => {
  it('round-trips JSON values', () => {
    const storage = new MemoryStorage();

    expect(writeJson(storage, 'profile', { reducedMotion: true })).toBe(true);
    expect(readJson(storage, 'profile')).toEqual({ reducedMotion: true });
  });

  it('returns null for missing or malformed values', () => {
    const storage = new MemoryStorage();

    expect(readJson(storage, 'missing')).toBeNull();
    storage.setItem('broken', '{');
    expect(readJson(storage, 'broken')).toBeNull();
  });

  it('returns false when storage is unavailable', () => {
    expect(writeJson(null, 'profile', { reducedMotion: true })).toBe(false);
    expect(readJson(null, 'profile')).toBeNull();
  });

  it('returns false when serialization fails', () => {
    const storage = new MemoryStorage();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    expect(writeJson(storage, 'circular', circular)).toBe(false);
  });

  it('removes keys and tolerates unavailable storage', () => {
    const storage = new MemoryStorage();
    storage.setItem('profile', '{}');

    removeStorage(storage, 'profile');
    expect(storage.getItem('profile')).toBeNull();
    expect(() => {
      removeStorage(null, 'profile');
    }).not.toThrow();
  });
});
