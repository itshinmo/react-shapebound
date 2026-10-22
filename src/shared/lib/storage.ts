export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PROBE_KEY = '__shapebound_probe__';

export function getBrowserStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

export function readJson(storage: StorageLike | null, key: string): unknown {
  if (storage === null) {
    return null;
  }

  const raw = storage.getItem(key);
  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeJson(storage: StorageLike | null, key: string, value: unknown): boolean {
  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(storage: StorageLike | null, key: string): void {
  if (storage === null) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in private or locked-down browsing contexts.
  }
}
