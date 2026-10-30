import { createSave, parseSave, type SaveEnvelope, type SaveParseError } from './save';
import {
  UPGRADE_KEYS,
  UPGRADE_MAX_LEVELS,
  createEmptyUpgrades,
  isUpgradeKey,
  isUpgradeLevels,
  type UpgradeKey,
  type UpgradeLevels,
} from './upgrades';

export const MAX_BLUE_POINTS = 1_000_000_000;

export interface BossCurrencies {
  readonly purple: number;
  readonly green: number;
  readonly orange: number;
}

export interface ProgressionV1Data {
  readonly bluePoints: number;
  readonly bestTimeMs: number;
  readonly runCount: number;
  readonly bossCurrencies: BossCurrencies;
}

export interface ProgressionData extends ProgressionV1Data {
  readonly upgrades: UpgradeLevels;
}

export type ProgressionRead =
  | { readonly kind: 'none' }
  | { readonly kind: 'valid'; readonly data: ProgressionData }
  | { readonly kind: 'unreadable'; readonly reason: SaveParseError }
  | { readonly kind: 'unavailable' };

export type ProgressionParse =
  | { readonly kind: 'valid'; readonly data: ProgressionData }
  | { readonly kind: 'unreadable'; readonly reason: SaveParseError };

export interface ProgressionCommitInput {
  readonly runPoints: number;
  readonly deathAtMs: number;
  readonly savedAt: string;
}

export type ProgressionCommit =
  | {
      readonly kind: 'ready';
      readonly data: ProgressionData;
      readonly envelope: SaveEnvelope<ProgressionData>;
    }
  | { readonly kind: 'unreadable'; readonly reason: SaveParseError }
  | { readonly kind: 'unavailable' };

export type UpgradeChange =
  | {
      readonly kind: 'ready';
      readonly data: ProgressionData;
      readonly envelope: SaveEnvelope<ProgressionData>;
    }
  | { readonly kind: 'unreadable'; readonly reason: SaveParseError }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'locked' }
  | { readonly kind: 'insufficient-points' }
  | { readonly kind: 'max-level' }
  | { readonly kind: 'no-upgrades' };

export function createEmptyProgression(): ProgressionData {
  return {
    bluePoints: 0,
    bestTimeMs: 0,
    runCount: 0,
    bossCurrencies: {
      purple: 0,
      green: 0,
      orange: 0,
    },
    upgrades: createEmptyUpgrades(),
  };
}

export function isProgressionV1Data(value: unknown): value is ProgressionV1Data {
  if (!isPlainRecord(value)) {
    return false;
  }

  const bossCurrencies = value['bossCurrencies'];

  if (!isPlainRecord(bossCurrencies)) {
    return false;
  }

  return (
    isBluePoints(value['bluePoints']) &&
    isNonNegativeSafeInteger(value['bestTimeMs']) &&
    isNonNegativeSafeInteger(value['runCount']) &&
    isNonNegativeSafeInteger(bossCurrencies['purple']) &&
    isNonNegativeSafeInteger(bossCurrencies['green']) &&
    isNonNegativeSafeInteger(bossCurrencies['orange'])
  );
}

export function isProgressionData(value: unknown): value is ProgressionData {
  return (
    isProgressionV1Data(value) &&
    isUpgradeLevels((value as { readonly upgrades?: unknown }).upgrades)
  );
}

export function migrateProgressionV1ToV2(value: unknown): ProgressionData | null {
  if (!isProgressionV1Data(value)) {
    return null;
  }

  return {
    bluePoints: value.bluePoints,
    bestTimeMs: value.bestTimeMs,
    runCount: value.runCount,
    bossCurrencies: {
      purple: value.bossCurrencies.purple,
      green: value.bossCurrencies.green,
      orange: value.bossCurrencies.orange,
    },
    upgrades: createEmptyUpgrades(),
  };
}

export function parseProgressionSave(raw: string): ProgressionParse {
  const parsed = parseSave(raw, isProgressionData, { 1: migrateProgressionV1ToV2 });

  if (!parsed.ok) {
    return { kind: 'unreadable', reason: parsed.reason };
  }

  return { kind: 'valid', data: parsed.save.data };
}

export function commitProgression(
  read: ProgressionRead,
  input: ProgressionCommitInput,
): ProgressionCommit {
  if (read.kind === 'unreadable') {
    return {
      kind: 'unreadable',
      reason: read.reason,
    };
  }

  if (read.kind === 'unavailable') {
    return {
      kind: 'unavailable',
    };
  }

  const base = read.kind === 'valid' ? read.data : createEmptyProgression();
  const data: ProgressionData = {
    bluePoints: Math.min(MAX_BLUE_POINTS, base.bluePoints + input.runPoints),
    bestTimeMs: Math.max(base.bestTimeMs, input.deathAtMs),
    runCount: Math.min(Number.MAX_SAFE_INTEGER, base.runCount + 1),
    bossCurrencies: {
      purple: base.bossCurrencies.purple,
      green: base.bossCurrencies.green,
      orange: base.bossCurrencies.orange,
    },
    upgrades: copyUpgradeLevels(base.upgrades),
  };

  return {
    kind: 'ready',
    data,
    envelope: createSave(data, input.savedAt),
  };
}

export function purchaseUpgrade(
  read: ProgressionRead,
  key: UpgradeKey,
  savedAt: string,
): UpgradeChange {
  if (read.kind === 'unreadable') {
    return { kind: 'unreadable', reason: read.reason };
  }

  if (read.kind === 'unavailable') {
    return { kind: 'unavailable' };
  }

  if (!isUpgradeKey(key)) {
    return { kind: 'locked' };
  }

  const base = read.kind === 'valid' ? read.data : createEmptyProgression();
  const level = base.upgrades[key];

  if (level >= UPGRADE_MAX_LEVELS[key]) {
    return { kind: 'max-level' };
  }

  if (base.bluePoints < 1) {
    return { kind: 'insufficient-points' };
  }

  const upgrades: UpgradeLevels = {
    ...copyUpgradeLevels(base.upgrades),
    [key]: level + 1,
  };
  const data = createNextProgression(base, base.bluePoints - 1, upgrades);

  return {
    kind: 'ready',
    data,
    envelope: createSave(data, savedAt),
  };
}

export function resetUpgrades(read: ProgressionRead, savedAt: string): UpgradeChange {
  if (read.kind === 'unreadable') {
    return { kind: 'unreadable', reason: read.reason };
  }

  if (read.kind === 'unavailable') {
    return { kind: 'unavailable' };
  }

  const base = read.kind === 'valid' ? read.data : createEmptyProgression();
  const spent = UPGRADE_KEYS.reduce((total, key) => total + base.upgrades[key], 0);

  if (spent === 0) {
    return { kind: 'no-upgrades' };
  }

  const data = createNextProgression(
    base,
    Math.min(MAX_BLUE_POINTS, base.bluePoints + spent),
    createEmptyUpgrades(),
  );

  return {
    kind: 'ready',
    data,
    envelope: createSave(data, savedAt),
  };
}

function createNextProgression(
  base: ProgressionData,
  bluePoints: number,
  upgrades: UpgradeLevels,
): ProgressionData {
  return {
    bluePoints,
    bestTimeMs: base.bestTimeMs,
    runCount: base.runCount,
    bossCurrencies: {
      purple: base.bossCurrencies.purple,
      green: base.bossCurrencies.green,
      orange: base.bossCurrencies.orange,
    },
    upgrades,
  };
}

function copyUpgradeLevels(levels: UpgradeLevels): UpgradeLevels {
  return {
    barrierCount: levels.barrierCount,
    movementSpeed: levels.movementSpeed,
    playerSize: levels.playerSize,
    arenaSize: levels.arenaSize,
    reflectCharges: levels.reflectCharges,
    reflectChargeSpeed: levels.reflectChargeSpeed,
    laserPierce: levels.laserPierce,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isBluePoints(value: unknown): value is number {
  return isNonNegativeSafeInteger(value) && value <= MAX_BLUE_POINTS;
}
