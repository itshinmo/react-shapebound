import { describe, expect, it, vi } from 'vitest';

import { SAVE_SCHEMA_VERSION, createSave, parseSave, serializeSave } from './save';

interface Sample {
  readonly value: number;
}

interface MigratedSample {
  readonly value: number;
  readonly migrated: true;
}

function isSample(value: unknown): value is Sample {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return typeof (value as Record<string, unknown>)['value'] === 'number';
}

function isMigratedSample(value: unknown): value is MigratedSample {
  if (!isSample(value)) {
    return false;
  }

  return (value as unknown as Record<string, unknown>)['migrated'] === true;
}

const savedAt = '2026-10-21T00:00:00.000Z';

describe('save envelope', () => {
  it('stamps the current schema version', () => {
    expect(SAVE_SCHEMA_VERSION).toBe(2);
    expect(createSave<Sample>({ value: 7 }, savedAt).schemaVersion).toBe(2);
  });

  it('round-trips valid save data', () => {
    const save = createSave<Sample>({ value: 7 }, savedAt);

    expect(parseSave(serializeSave(save), isSample)).toEqual({ ok: true, save });
  });

  it('rejects malformed JSON', () => {
    expect(parseSave('{', isSample)).toEqual({ ok: false, reason: 'invalid-json' });
  });

  it('rejects non-object envelopes', () => {
    expect(parseSave('null', isSample)).toEqual({ ok: false, reason: 'invalid-envelope' });
    expect(parseSave('[]', isSample)).toEqual({ ok: false, reason: 'invalid-envelope' });
  });

  it('rejects envelopes with missing fields', () => {
    expect(parseSave(JSON.stringify({ schemaVersion: 1, data: { value: 1 } }), isSample)).toEqual({
      ok: false,
      reason: 'invalid-envelope',
    });
  });

  it('rejects unsupported schema versions without a migration', () => {
    const save = createSave<Sample>({ value: 7 }, savedAt);

    expect(parseSave(serializeSave({ ...save, schemaVersion: 99 }), isSample)).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
    expect(parseSave(serializeSave({ ...save, schemaVersion: 1 }), isSample)).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
  });

  it('rejects data that fails the validator', () => {
    const save = createSave<unknown>({ value: 'seven' }, savedAt);

    expect(parseSave(serializeSave(save), isSample)).toEqual({
      ok: false,
      reason: 'invalid-data',
    });
  });
});

describe('save migrations', () => {
  const v1 = {
    schemaVersion: 1,
    savedAt,
    data: { value: 7 },
  };
  const migrate = (data: unknown): MigratedSample | null =>
    isSample(data) ? { value: data.value, migrated: true } : null;

  it('normalizes a supported old envelope and preserves savedAt', () => {
    expect(parseSave(JSON.stringify(v1), isMigratedSample, { 1: migrate })).toEqual({
      ok: true,
      save: {
        schemaVersion: 2,
        savedAt,
        data: { value: 7, migrated: true },
      },
    });
  });

  it('returns invalid-data when a migration returns null', () => {
    expect(parseSave(JSON.stringify(v1), isMigratedSample, { 1: () => null })).toEqual({
      ok: false,
      reason: 'invalid-data',
    });
  });

  it('returns invalid-data when a migration throws', () => {
    expect(
      parseSave(JSON.stringify(v1), isMigratedSample, {
        1: () => {
          throw new Error('broken migration');
        },
      }),
    ).toEqual({
      ok: false,
      reason: 'invalid-data',
    });
  });

  it('returns invalid-data when migrated data fails the current validator', () => {
    expect(
      parseSave(JSON.stringify(v1), isSample, {
        1: () => ({ migrated: true }) as unknown as Sample,
      }),
    ).toEqual({
      ok: false,
      reason: 'invalid-data',
    });
  });

  it('ignores a migration for the current version', () => {
    const current = createSave<Sample>({ value: 7 }, savedAt);
    const migration = vi.fn(() => ({ value: 99, migrated: true }) as unknown as Sample);

    expect(parseSave(serializeSave(current), isSample, { 2: migration })).toEqual({
      ok: true,
      save: current,
    });
    expect(migration).not.toHaveBeenCalled();
  });

  it('reports unsupported-version for a version with no migration', () => {
    expect(
      parseSave(JSON.stringify({ ...v1, schemaVersion: 3 }), isMigratedSample, { 1: migrate }),
    ).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
  });
});
