export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_STORAGE_KEY = 'shapebound:save';

export interface SaveEnvelope<T> {
  readonly schemaVersion: number;
  readonly savedAt: string;
  readonly data: T;
}

export type SaveParseError =
  'invalid-json' | 'invalid-envelope' | 'unsupported-version' | 'invalid-data';

export type SaveParseResult<T> =
  | { readonly ok: true; readonly save: SaveEnvelope<T> }
  | { readonly ok: false; readonly reason: SaveParseError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createSave<T>(data: T, savedAt: string): SaveEnvelope<T> {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt,
    data,
  };
}

export function serializeSave<T>(save: SaveEnvelope<T>): string {
  return JSON.stringify(save);
}

export function parseSave<T>(
  raw: string,
  validate: (value: unknown) => value is T,
): SaveParseResult<T> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: 'invalid-envelope' };
  }

  const { schemaVersion, savedAt, data } = parsed;

  if (typeof schemaVersion !== 'number' || typeof savedAt !== 'string' || savedAt.length === 0) {
    return { ok: false, reason: 'invalid-envelope' };
  }

  if (schemaVersion !== SAVE_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported-version' };
  }

  if (!validate(data)) {
    return { ok: false, reason: 'invalid-data' };
  }

  return {
    ok: true,
    save: {
      schemaVersion,
      savedAt,
      data,
    },
  };
}
