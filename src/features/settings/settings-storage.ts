import { removeStorage, readJson, writeJson } from '@/shared/lib/storage';
import type { StorageLike } from '@/shared/lib/storage';

export const SETTINGS_STORAGE_KEY = 'shapebound:settings';
export const SETTINGS_SCHEMA_VERSION = 2;

export const GLOW_INTENSITY_MIN = 0;
export const GLOW_INTENSITY_MAX = 100;
export const GLOW_INTENSITY_STEP = 5;
export const DEFAULT_GLOW_INTENSITY = 100;

export interface Settings {
  readonly reducedMotion: boolean;
  readonly glowIntensity: number;
}

interface SettingsRecord {
  readonly version: number;
  readonly reducedMotion: boolean;
  readonly glowIntensity?: unknown;
}

export function getSystemReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function getDefaultSettings(systemReducedMotion: boolean): Settings {
  return {
    reducedMotion: systemReducedMotion,
    glowIntensity: DEFAULT_GLOW_INTENSITY,
  };
}

export function normalizeGlowIntensity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GLOW_INTENSITY;
  }

  const stepped = Math.round(value / GLOW_INTENSITY_STEP) * GLOW_INTENSITY_STEP;

  return Math.min(GLOW_INTENSITY_MAX, Math.max(GLOW_INTENSITY_MIN, stepped));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSettingsRecord(value: unknown): value is SettingsRecord {
  return (
    isRecord(value) &&
    typeof value['version'] === 'number' &&
    typeof value['reducedMotion'] === 'boolean'
  );
}

function isValidGlowIntensity(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= GLOW_INTENSITY_MIN &&
    value <= GLOW_INTENSITY_MAX
  );
}

export function loadSettings(storage: StorageLike | null, systemReducedMotion: boolean): Settings {
  const parsed = readJson(storage, SETTINGS_STORAGE_KEY);

  if (!isSettingsRecord(parsed)) {
    return getDefaultSettings(systemReducedMotion);
  }

  if (parsed.version === 1) {
    return {
      reducedMotion: parsed.reducedMotion,
      glowIntensity: DEFAULT_GLOW_INTENSITY,
    };
  }

  if (parsed.version !== SETTINGS_SCHEMA_VERSION || !isValidGlowIntensity(parsed.glowIntensity)) {
    return getDefaultSettings(systemReducedMotion);
  }

  return {
    reducedMotion: parsed.reducedMotion,
    glowIntensity: normalizeGlowIntensity(parsed.glowIntensity),
  };
}

export function saveSettings(storage: StorageLike | null, settings: Settings): boolean {
  return writeJson(storage, SETTINGS_STORAGE_KEY, {
    version: SETTINGS_SCHEMA_VERSION,
    reducedMotion: settings.reducedMotion,
    glowIntensity: normalizeGlowIntensity(settings.glowIntensity),
  });
}

export function clearSettings(storage: StorageLike | null): void {
  removeStorage(storage, SETTINGS_STORAGE_KEY);
}
