import { act, renderHook } from '@testing-library/react';
import { StrictMode, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmptyProgression, parseProgressionSave } from '@/game/progression';
import type { ProgressionData, ProgressionRead } from '@/game/progression';
import { advanceRun, createRun, formatElapsed } from '@/game/run';
import { createSave } from '@/game/save';
import type { SaveEnvelope } from '@/game/save';

import { useRunLoop } from './use-run-loop';

import type { ProgressionStorage } from './progression-storage';
import type { RunFrame, RunFrameResult, UseRunLoopOptions } from './use-run-loop';
import type { ReactNode } from 'react';

const SAVED_AT = '2026-10-26T12:00:00.000Z';
const ALIVE_RESULT: RunFrameResult = { playerAlive: true, deathAtMs: null };

class FakeAnimationFrames {
  now = 0;
  private nextId = 1;
  private readonly callbacks = new Map<number, FrameRequestCallback>();

  readonly request = vi.fn((callback: FrameRequestCallback) => {
    const id = this.nextId;

    this.nextId += 1;
    this.callbacks.set(id, callback);
    return id;
  });

  readonly cancel = vi.fn((id: number) => {
    this.callbacks.delete(id);
  });

  advance(deltaMs: number): void {
    this.now += deltaMs;
  }

  flush(): void {
    const pending = [...this.callbacks.values()];

    this.callbacks.clear();

    for (const callback of pending) {
      callback(this.now);
    }
  }

  get pending(): number {
    return this.callbacks.size;
  }
}

let frames: FakeAnimationFrames;
let visibility: 'visible' | 'hidden';

beforeEach(() => {
  frames = new FakeAnimationFrames();
  visibility = 'visible';
  vi.stubGlobal('requestAnimationFrame', frames.request);
  vi.stubGlobal('cancelAnimationFrame', frames.cancel);
  vi.spyOn(performance, 'now').mockImplementation(() => frames.now);
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState;
});

function createStorage(readValue: ProgressionRead) {
  let currentRead = readValue;
  let writeResult = true;
  const read = vi.fn(() => currentRead);
  const write = vi.fn((_envelope: SaveEnvelope<ProgressionData>) => writeResult);
  const clear = vi.fn(() => undefined);
  const storage: ProgressionStorage = { read, write, clear };

  return {
    storage,
    read,
    write,
    clear,
    setRead(next: ProgressionRead) {
      currentRead = next;
    },
    setWriteResult(next: boolean) {
      writeResult = next;
    },
  };
}

function renderRunLoop(
  overrides: Partial<UseRunLoopOptions> = {},
  read: ProgressionRead = { kind: 'none' },
) {
  const fake = createStorage(read);
  const options: UseRunLoopOptions = {
    running: true,
    initialSeed: 7,
    createSeed: () => 8,
    storage: fake.storage,
    onFrame: () => ALIVE_RESULT,
    savedAt: () => SAVED_AT,
    ...overrides,
  };
  const { result, rerender, unmount } = renderHook(
    (props: UseRunLoopOptions) => useRunLoop(props),
    {
      initialProps: options,
    },
  );

  return { result, rerender, unmount, fake, options };
}

function runFrame(deltaMs = 50): void {
  act(() => {
    frames.advance(deltaMs);
    frames.flush();
  });
}

function runFrames(count: number, deltaMs = 50): void {
  act(() => {
    for (let index = 0; index < count; index += 1) {
      frames.advance(deltaMs);
      frames.flush();
    }
  });
}

function dieAt(stepEndMs: number): (frame: RunFrame) => RunFrameResult {
  return (frame) =>
    frame.fixedStepEndsMs.includes(stepEndMs)
      ? { playerAlive: false, deathAtMs: stepEndMs }
      : ALIVE_RESULT;
}

function expectedData(overrides: Partial<ProgressionData> = {}): ProgressionData {
  return {
    ...createEmptyProgression(),
    ...overrides,
  };
}

describe('useRunLoop lifecycle', () => {
  it('starts an active zeroed run without reading or writing storage', () => {
    const { result, fake } = renderRunLoop();

    expect(result.current.runRef.current).toEqual(createRun(7));
    expect(result.current.snapshot).toEqual({
      seed: 7,
      status: 'active',
      freezeReasons: [],
      banner: null,
      commit: 'none',
      deathAtMs: null,
    });
    expect(result.current.committedData).toBeNull();
    expect(result.current.commitReason).toBeNull();
    expect(fake.read).not.toHaveBeenCalled();
    expect(fake.write).not.toHaveBeenCalled();
  });

  it('does not schedule a frame until running is true', () => {
    const { result } = renderRunLoop({ running: false });

    expect(frames.pending).toBe(0);

    frames.advance(1_000);
    frames.flush();

    expect(result.current.runRef.current.elapsedMs).toBe(0);
  });
});

describe('run clock and fixed steps', () => {
  it('clamps frames, floors integer time, retains the sub-ms remainder, and uses absolute ends', () => {
    const seen: RunFrame[] = [];
    const { result } = renderRunLoop({
      onFrame: (frame) => {
        seen.push(frame);
        return ALIVE_RESULT;
      },
    });

    runFrame(10.5);
    runFrame(9.5);
    runFrame(1_000);

    expect(seen.map((frame) => frame.activeMs)).toEqual([10, 10, 50]);
    expect(seen.map((frame) => frame.fixedStepEndsMs)).toEqual([[], [20], [40, 60]]);
    expect(result.current.runRef.current.elapsedMs).toBe(70);
  });

  it('runs at most three fixed steps per frame with absolute step ends', () => {
    const seen: RunFrame[] = [];
    renderRunLoop({
      onFrame: (frame) => {
        seen.push(frame);
        return ALIVE_RESULT;
      },
    });

    runFrame(19);
    runFrame(50);

    expect(seen[1]?.fixedStepEndsMs).toEqual([20, 40, 60]);
    expect(seen[1]?.fixedStepEndsMs).toHaveLength(3);
  });

  it('keeps the snapshot identity stable across elapsed-only frames', () => {
    const { result } = renderRunLoop();
    const initial = result.current.snapshot;

    runFrame(50);
    runFrame(50);

    expect(result.current.snapshot).toBe(initial);

    act(() => {
      result.current.pause();
    });

    const paused = result.current.snapshot;

    expect(paused).not.toBe(initial);
    expect(paused.freezeReasons).toEqual(['pause']);

    act(() => {
      result.current.resume();
    });

    expect(result.current.snapshot.freezeReasons).toEqual([]);
  });

  it('updates the snapshot when the boss banner starts or changes color, not on its remainder', () => {
    const { result } = renderRunLoop();

    act(() => {
      result.current.runRef.current = advanceRun(result.current.runRef.current, 299_950);
    });
    runFrame(50);

    const firstBanner = result.current.snapshot;

    expect(firstBanner.banner).toEqual({ bossIndex: 1, color: 'purple' });

    runFrame(50);

    expect(result.current.snapshot).toBe(firstBanner);

    act(() => {
      result.current.runRef.current = advanceRun(result.current.runRef.current, 299_950);
    });
    runFrame(50);

    const secondBanner = result.current.snapshot;

    expect(secondBanner.banner).toEqual({ bossIndex: 2, color: 'green' });
    expect(secondBanner).not.toBe(firstBanner);
  });
});

describe('freeze behavior', () => {
  it('pauses and resumes without catching up on wall time', () => {
    const seen: RunFrame[] = [];
    const { result } = renderRunLoop({
      onFrame: (frame) => {
        seen.push(frame);
        return ALIVE_RESULT;
      },
    });

    runFrame(100);

    expect(result.current.runRef.current.elapsedMs).toBe(50);

    act(() => {
      result.current.pause();
    });

    expect(frames.pending).toBe(0);

    act(() => {
      frames.advance(10_000);
      frames.flush();
    });

    expect(seen).toHaveLength(1);
    expect(result.current.runRef.current.elapsedMs).toBe(50);

    act(() => {
      result.current.resume();
    });
    runFrame(50);

    expect(seen).toHaveLength(2);
    expect(result.current.runRef.current.elapsedMs).toBe(100);
  });

  it('preserves the fixed-step accumulator and sub-ms remainder across a freeze', () => {
    const seen: RunFrame[] = [];
    const { result } = renderRunLoop({
      onFrame: (frame) => {
        seen.push(frame);
        return ALIVE_RESULT;
      },
    });

    runFrame(19.5);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.run.elapsedMs).toBe(19);
    expect(seen[0]?.fixedStepEndsMs).toEqual([]);

    act(() => {
      result.current.pause();
    });

    act(() => {
      frames.advance(10_000);
      frames.flush();
    });

    act(() => {
      result.current.resume();
    });

    runFrame(0.5);

    expect(seen).toHaveLength(2);
    expect(seen[1]?.run.elapsedMs).toBe(20);
    expect(seen[1]?.fixedStepEndsMs).toEqual([20]);
  });

  it('stacks hidden and focus reasons without opening a menu', () => {
    const { result } = renderRunLoop();

    visibility = 'hidden';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.snapshot.freezeReasons).toEqual(['hidden']);

    act(() => {
      result.current.pause();
    });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause', 'hidden']);

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause', 'hidden']);

    visibility = 'visible';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause']);

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause', 'focus']);

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause']);

    act(() => {
      result.current.resume();
    });

    expect(result.current.snapshot.freezeReasons).toEqual([]);
  });

  it('opens pause once when portrait returns to landscape', () => {
    const { result, options, rerender } = renderRunLoop();

    rerender({ ...options, portrait: true });

    expect(result.current.snapshot.freezeReasons).toEqual(['portrait']);

    rerender({ ...options, portrait: false });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause']);

    const paused = result.current.snapshot;

    rerender({ ...options, portrait: false });

    expect(result.current.snapshot).toBe(paused);
    expect(result.current.snapshot.freezeReasons).toEqual(['pause']);
  });

  it('stacks portrait on an existing pause and keeps it paused on return', () => {
    const { result, options, rerender } = renderRunLoop();

    act(() => {
      result.current.pause();
    });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause']);

    rerender({ ...options, portrait: true });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause', 'portrait']);

    rerender({ ...options, portrait: false });

    expect(result.current.snapshot.freezeReasons).toEqual(['pause']);

    act(() => {
      result.current.resume();
    });

    expect(result.current.snapshot.freezeReasons).toEqual([]);
  });

  it('adds no pause reason when portrait returns after death', () => {
    const { result, options, rerender } = renderRunLoop({
      onFrame: () => ({ playerAlive: false, deathAtMs: 0 }),
    });

    runFrame(50);

    expect(result.current.snapshot.status).toBe('over');
    expect(result.current.snapshot.freezeReasons).toEqual([]);

    rerender({ ...options, portrait: true });
    rerender({ ...options, portrait: false });

    expect(result.current.snapshot.freezeReasons).toEqual([]);
  });
});

describe('death and commit', () => {
  it('ends at the fatal fixed step, reads pending, then saves once with the final values', () => {
    const savedAt = vi.fn(() => SAVED_AT);
    const fake = createStorage({ kind: 'none' });
    let commitAtRead: string | null = null;
    const { result } = renderRunLoop({
      storage: fake.storage,
      savedAt,
      onFrame: dieAt(1_000),
    });

    fake.read.mockImplementation(() => {
      commitAtRead = result.current.runRef.current.commit;
      return { kind: 'none' };
    });

    runFrames(20);

    const expected = expectedData({
      bluePoints: 1,
      bestTimeMs: 1_000,
      runCount: 1,
    });

    expect(commitAtRead).toBe('pending');
    expect(result.current.runRef.current.status).toBe('over');
    expect(result.current.runRef.current.elapsedMs).toBe(1_000);
    expect(result.current.runRef.current.deathAtMs).toBe(1_000);
    expect(formatElapsed(result.current.runRef.current.elapsedMs).points).toBe(1);
    expect(result.current.snapshot).toMatchObject({
      status: 'over',
      commit: 'saved',
      deathAtMs: 1_000,
      freezeReasons: [],
      banner: null,
    });
    expect(result.current.committedData).toEqual(expected);
    expect(fake.read).toHaveBeenCalledTimes(1);
    expect(fake.write).toHaveBeenCalledTimes(1);
    expect(fake.write.mock.calls[0]?.[0]).toEqual(createSave(expected, SAVED_AT));
    expect(savedAt).toHaveBeenCalledTimes(1);
  });

  it('writes the zero base with runCount 1 for a missing save and a zero-length death', () => {
    const { result, fake } = renderRunLoop({
      onFrame: () => ({ playerAlive: false, deathAtMs: 0 }),
    });

    runFrame(50);

    const expected = expectedData({ runCount: 1 });

    expect(fake.write.mock.calls[0]?.[0]).toEqual(createSave(expected, SAVED_AT));
    expect(result.current.snapshot.commit).toBe('saved');
    expect(result.current.committedData).toEqual(expected);
  });

  it('writes a v2 envelope with zero upgrades from a migrated v1 record', () => {
    const v1 = {
      schemaVersion: 1,
      savedAt: SAVED_AT,
      data: {
        bluePoints: 10,
        bestTimeMs: 2_000,
        runCount: 3,
        bossCurrencies: { purple: 1, green: 2, orange: 3 },
      },
    };
    const read = parseProgressionSave(JSON.stringify(v1));

    if (read.kind !== 'valid') {
      throw new Error('Expected the v1 fixture to migrate.');
    }

    const { result, fake } = renderRunLoop({ onFrame: dieAt(1_000) }, read);

    runFrames(20);

    const expected = expectedData({
      bluePoints: 11,
      bestTimeMs: 2_000,
      runCount: 4,
      bossCurrencies: { purple: 1, green: 2, orange: 3 },
    });
    const envelope = fake.write.mock.calls[0]?.[0];

    expect(envelope).toEqual(createSave(expected, SAVED_AT));
    expect(envelope?.schemaVersion).toBe(2);
    expect(envelope?.data.upgrades).toEqual(createEmptyProgression().upgrades);
    expect(result.current.snapshot.commit).toBe('saved');
  });

  it('preserves v2 upgrade levels in the death commit', () => {
    const upgrades = {
      barrierCount: 2,
      movementSpeed: 3,
      playerSize: 1,
      arenaSize: 4,
      reflectCharges: 2,
      reflectChargeSpeed: 1,
      laserPierce: 2,
    };
    const { result, fake } = renderRunLoop(
      { onFrame: dieAt(1_000) },
      { kind: 'valid', data: expectedData({ bluePoints: 3, upgrades }) },
    );

    runFrames(20);

    const expected = expectedData({ bluePoints: 4, bestTimeMs: 1_000, runCount: 1, upgrades });

    expect(fake.write.mock.calls[0]?.[0]).toEqual(createSave(expected, SAVED_AT));
    expect(result.current.committedData?.upgrades).toEqual(upgrades);
  });

  it('records the death time but zero blue points for a sub-second missing-save death', () => {
    const { result, fake } = renderRunLoop({ onFrame: dieAt(500) });

    runFrames(10);

    const expected = expectedData({
      bluePoints: 0,
      bestTimeMs: 500,
      runCount: 1,
    });

    expect(fake.write.mock.calls[0]?.[0]).toEqual(createSave(expected, SAVED_AT));
    expect(result.current.committedData).toEqual(expected);
  });

  it('writes nothing and reports the reason for an unreadable save', () => {
    const { result, fake } = renderRunLoop(
      { onFrame: () => ({ playerAlive: false, deathAtMs: 0 }) },
      { kind: 'unreadable', reason: 'invalid-data' },
    );

    runFrame(50);

    expect(fake.read).toHaveBeenCalledTimes(1);
    expect(fake.write).not.toHaveBeenCalled();
    expect(result.current.snapshot.commit).toBe('unreadable');
    expect(result.current.commitReason).toBe('invalid-data');
    expect(result.current.committedData).toBeNull();

    act(() => {
      result.current.retryCommit();
    });

    expect(fake.write).not.toHaveBeenCalled();
    expect(result.current.snapshot.commit).toBe('unreadable');
  });

  it('writes nothing and reports unavailable storage', () => {
    const { result, fake } = renderRunLoop(
      { onFrame: () => ({ playerAlive: false, deathAtMs: 0 }) },
      { kind: 'unavailable' },
    );

    runFrame(50);

    expect(fake.write).not.toHaveBeenCalled();
    expect(result.current.snapshot.commit).toBe('unavailable');
    expect(result.current.commitReason).toBeNull();
    expect(result.current.committedData).toBeNull();

    act(() => {
      result.current.retryCommit();
    });

    expect(fake.write).not.toHaveBeenCalled();
  });

  it('retries a failed write with the same envelope and never re-reads or re-adds', () => {
    const savedAt = vi.fn(() => SAVED_AT);
    const fake = createStorage({ kind: 'none' });

    fake.setWriteResult(false);

    const { result } = renderRunLoop({
      storage: fake.storage,
      savedAt,
      onFrame: dieAt(1_000),
    });

    runFrames(20);

    const expected = expectedData({
      bluePoints: 1,
      bestTimeMs: 1_000,
      runCount: 1,
    });

    expect(result.current.snapshot.commit).toBe('failed');
    expect(result.current.committedData).toBeNull();
    expect(fake.write).toHaveBeenCalledTimes(1);
    expect(fake.write.mock.calls[0]?.[0]).toEqual(createSave(expected, SAVED_AT));
    expect(fake.read).toHaveBeenCalledTimes(1);
    expect(savedAt).toHaveBeenCalledTimes(1);

    const latched = fake.write.mock.calls[0]?.[0];

    fake.setWriteResult(true);

    act(() => {
      result.current.retryCommit();
    });

    expect(result.current.snapshot.commit).toBe('saved');
    expect(result.current.committedData).toEqual(expected);
    expect(fake.read).toHaveBeenCalledTimes(1);
    expect(savedAt).toHaveBeenCalledTimes(1);
    expect(fake.write).toHaveBeenCalledTimes(2);
    expect(fake.write.mock.calls[1]?.[0]).toBe(latched);

    act(() => {
      result.current.retryCommit();
    });

    expect(fake.write).toHaveBeenCalledTimes(2);
    expect(result.current.snapshot.commit).toBe('saved');
  });

  it('stops stepping after the callback reports death', () => {
    const onFrame = vi.fn((frame: RunFrame): RunFrameResult =>
      frame.fixedStepEndsMs.includes(60) ? { playerAlive: false, deathAtMs: 60 } : ALIVE_RESULT,
    );
    const { result } = renderRunLoop({ onFrame });

    runFrame(50);
    runFrame(50);

    expect(result.current.runRef.current.status).toBe('over');
    expect(result.current.runRef.current.elapsedMs).toBe(60);
    expect(result.current.runRef.current.deathAtMs).toBe(60);
    expect(frames.pending).toBe(0);
    expect(onFrame).toHaveBeenCalledTimes(2);

    runFrames(5);

    expect(onFrame).toHaveBeenCalledTimes(2);
  });

  it('commits once under StrictMode double effects', () => {
    const fake = createStorage({ kind: 'none' });
    const options: UseRunLoopOptions = {
      running: true,
      initialSeed: 7,
      createSeed: () => 8,
      storage: fake.storage,
      onFrame: dieAt(1_000),
      savedAt: () => SAVED_AT,
    };
    const { result } = renderHook((props: UseRunLoopOptions) => useRunLoop(props), {
      initialProps: options,
      wrapper: ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children),
    });

    runFrames(20);

    expect(result.current.snapshot.commit).toBe('saved');
    expect(fake.read).toHaveBeenCalledTimes(1);
    expect(fake.write).toHaveBeenCalledTimes(1);
  });
});

describe('restart and retry', () => {
  it('creates a new seed, resets the run, and clears the frame remainder and step accumulator', () => {
    const createSeed = vi.fn().mockReturnValueOnce(200).mockReturnValueOnce(300);
    const onReset = vi.fn();
    const seen: RunFrame[] = [];
    const { result, fake } = renderRunLoop({
      initialSeed: 100,
      createSeed,
      onReset,
      onFrame: (frame) => {
        seen.push(frame);
        return ALIVE_RESULT;
      },
    });

    runFrame(19);

    expect(result.current.runRef.current.seed).toBe(100);
    expect(result.current.runRef.current.elapsedMs).toBe(19);

    act(() => {
      result.current.restart();
    });

    expect(result.current.runRef.current).toEqual(createRun(200));
    expect(result.current.snapshot).toEqual({
      seed: 200,
      status: 'active',
      freezeReasons: [],
      banner: null,
      commit: 'none',
      deathAtMs: null,
    });
    expect(onReset).toHaveBeenLastCalledWith(200);
    expect(fake.read).not.toHaveBeenCalled();
    expect(fake.write).not.toHaveBeenCalled();

    seen.length = 0;
    runFrame(50);

    expect(seen[0]?.run.elapsedMs).toBe(50);
    expect(seen[0]?.fixedStepEndsMs).toEqual([20, 40]);

    act(() => {
      result.current.retry();
    });

    expect(result.current.runRef.current).toEqual(createRun(300));
    expect(onReset).toHaveBeenLastCalledWith(300);
    expect(onReset).toHaveBeenCalledTimes(2);
    expect(fake.read).not.toHaveBeenCalled();
    expect(fake.write).not.toHaveBeenCalled();
  });

  it('clears commit state and the latch when restarting after an unreadable death', () => {
    const { result, fake } = renderRunLoop(
      { onFrame: () => ({ playerAlive: false, deathAtMs: 0 }) },
      { kind: 'unreadable', reason: 'invalid-json' },
    );

    runFrame(50);

    expect(result.current.commitReason).toBe('invalid-json');

    act(() => {
      result.current.restart();
    });

    expect(result.current.runRef.current).toEqual(createRun(8));
    expect(result.current.snapshot.commit).toBe('none');
    expect(result.current.committedData).toBeNull();
    expect(result.current.commitReason).toBeNull();
    expect(fake.write).not.toHaveBeenCalled();

    act(() => {
      result.current.retryCommit();
    });

    expect(fake.write).not.toHaveBeenCalled();
  });
});
