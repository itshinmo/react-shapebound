import { removeStorage, readJson, writeJson } from '@/shared/lib/storage';
import type { StorageLike } from '@/shared/lib/storage';

export const SETTINGS_STORAGE_KEY = 'shapebound:settings';
export const SETTINGS_SCHEMA_VERSION = 1;

export interface Settings {
  readonly reducedMotion: boolean;
}

interface SettingsRecord {
  readonly version: number;
  readonly reducedMotion: boolean;
}

export function getSystemReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function getDefaultSettings(systemReducedMotion: boolean): Settings {
  return { reducedMotion: systemReducedMotion };
}

function isSettingsRecord(value: unknown): value is SettingsRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record['version'] === 'number' && typeof record['reducedMotion'] === 'boolean';
}

export function loadSettings(storage: StorageLike | null, systemReducedMotion: boolean): Settings {
  const parsed = readJson(storage, SETTINGS_STORAGE_KEY);

  if (!isSettingsRecord(parsed) || parsed.version !== SETTINGS_SCHEMA_VERSION) {
    return getDefaultSettings(systemReducedMotion);
  }

  return { reducedMotion: parsed.reducedMotion };
}

export function saveSettings(storage: StorageLike | null, settings: Settings): boolean {
  return writeJson(storage, SETTINGS_STORAGE_KEY, {
    version: SETTINGS_SCHEMA_VERSION,
    reducedMotion: settings.reducedMotion,
  });
}

export function clearSettings(storage: StorageLike | null): void {
  removeStorage(storage, SETTINGS_STORAGE_KEY);
}
