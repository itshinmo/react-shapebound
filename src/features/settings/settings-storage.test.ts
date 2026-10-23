import { describe, expect, it } from 'vitest';

import type { StorageLike } from '@/shared/lib/storage';

import {
  DEFAULT_GLOW_INTENSITY,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  getDefaultSettings,
  loadSettings,
  normalizeGlowIntensity,
  saveSettings,
} from './settings-storage';

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

describe('settings storage', () => {
  it('provides system-aware defaults', () => {
    expect(getDefaultSettings(true)).toEqual({
      reducedMotion: true,
      glowIntensity: DEFAULT_GLOW_INTENSITY,
    });
  });

  it('migrates a version 1 record with the default glow', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, reducedMotion: true }));

    expect(loadSettings(storage, false)).toEqual({
      reducedMotion: true,
      glowIntensity: DEFAULT_GLOW_INTENSITY,
    });
  });

  it('loads and normalizes a version 2 record', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, reducedMotion: false, glowIntensity: 42 }),
    );

    expect(loadSettings(storage, true)).toEqual({
      reducedMotion: false,
      glowIntensity: 40,
    });
  });

  it('falls back to defaults for malformed or unsupported records', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, reducedMotion: false, glowIntensity: 150 }),
    );

    expect(loadSettings(storage, true)).toEqual({
      reducedMotion: true,
      glowIntensity: DEFAULT_GLOW_INTENSITY,
    });
  });

  it('saves the current schema version and both settings', () => {
    const storage = new MemoryStorage();

    expect(saveSettings(storage, { reducedMotion: true, glowIntensity: 65 })).toBe(true);
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? '')).toEqual({
      version: SETTINGS_SCHEMA_VERSION,
      reducedMotion: true,
      glowIntensity: 65,
    });
  });

  it('clamps and steps glow intensity', () => {
    expect(normalizeGlowIntensity(-10)).toBe(0);
    expect(normalizeGlowIntensity(42)).toBe(40);
    expect(normalizeGlowIntensity(150)).toBe(100);
    expect(normalizeGlowIntensity(Number.NaN)).toBe(DEFAULT_GLOW_INTENSITY);
  });
});
