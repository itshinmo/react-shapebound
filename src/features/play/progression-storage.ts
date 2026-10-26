import { isProgressionData, type ProgressionData, type ProgressionRead } from '@/game/progression';
import { SAVE_STORAGE_KEY, parseSave, serializeSave } from '@/game/save';
import type { SaveEnvelope } from '@/game/save';
import { removeStorage } from '@/shared/lib/storage';
import type { StorageLike } from '@/shared/lib/storage';

export interface ProgressionStorage {
  read(): ProgressionRead;
  write(envelope: SaveEnvelope<ProgressionData>): boolean;
  clear(): void;
}

export function readProgression(storage: StorageLike | null): ProgressionRead {
  if (storage === null) {
    return { kind: 'unavailable' };
  }

  let raw: string | null;

  try {
    raw = storage.getItem(SAVE_STORAGE_KEY);
  } catch {
    return { kind: 'unavailable' };
  }

  if (raw === null) {
    return { kind: 'none' };
  }

  const parsed = parseSave(raw, isProgressionData);

  if (!parsed.ok) {
    return { kind: 'unreadable', reason: parsed.reason };
  }

  return { kind: 'valid', data: parsed.save.data };
}

export function writeProgression(
  storage: StorageLike | null,
  envelope: SaveEnvelope<ProgressionData>,
): boolean {
  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(SAVE_STORAGE_KEY, serializeSave(envelope));
    return true;
  } catch {
    return false;
  }
}

export function clearProgression(storage: StorageLike | null): void {
  removeStorage(storage, SAVE_STORAGE_KEY);
}

export function createProgressionStorage(storage: StorageLike | null): ProgressionStorage {
  return {
    read: () => readProgression(storage),
    write: (envelope) => writeProgression(storage, envelope),
    clear: () => {
      clearProgression(storage);
    },
  };
}
