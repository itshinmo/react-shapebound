import { describe, expect, it } from 'vitest';

import { createSave, parseSave, serializeSave } from './save';

interface Sample {
  readonly value: number;
}

function isSample(value: unknown): value is Sample {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return typeof (value as Record<string, unknown>)['value'] === 'number';
}

const savedAt = '2026-10-21T00:00:00.000Z';

describe('save envelope', () => {
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

  it('rejects unsupported schema versions', () => {
    const save = createSave<Sample>({ value: 7 }, savedAt);

    expect(parseSave(serializeSave({ ...save, schemaVersion: 99 }), isSample)).toEqual({
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
