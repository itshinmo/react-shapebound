import { createSave, type SaveEnvelope, type SaveParseError } from './save';

export const MAX_BLUE_POINTS = 1_000_000_000;

export interface BossCurrencies {
  readonly purple: number;
  readonly green: number;
  readonly orange: number;
}

export interface ProgressionData {
  readonly bluePoints: number;
  readonly bestTimeMs: number;
  readonly runCount: number;
  readonly bossCurrencies: BossCurrencies;
}

export type ProgressionRead =
  | { readonly kind: 'none' }
  | { readonly kind: 'valid'; readonly data: ProgressionData }
  | { readonly kind: 'unreadable'; readonly reason: SaveParseError }
  | { readonly kind: 'unavailable' };

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
  };
}

export function isProgressionData(value: unknown): value is ProgressionData {
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
  };

  return {
    kind: 'ready',
    data,
    envelope: createSave(data, input.savedAt),
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
