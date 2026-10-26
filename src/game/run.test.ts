import { describe, expect, it } from 'vitest';

import {
  BOSS_BANNER_MS,
  BOSS_COLORS,
  BOSS_INTERVAL_MS,
  NODE_CLIP_PAD_PX,
  PLAYHEAD_X_PX,
  POINTS_PER_SECOND,
  TIMELINE_WIDTH_PX,
  TIMELINE_WINDOW_MS,
  addFreeze,
  advanceRun,
  createRun,
  endRun,
  formatElapsed,
  openPause,
  removeFreeze,
  resume,
  retryCommit,
  settleCommit,
  type FreezeReason,
  type RunState,
} from './run';

const SEED = 1234;

function createTestRun(seed = SEED): RunState {
  return createRun(seed);
}

function advanceTo(elapsedMs: number, seed = SEED): RunState {
  return advanceRun(createTestRun(seed), elapsedMs);
}

function freezeRun(run: RunState, ...reasons: FreezeReason[]): RunState {
  return reasons.reduce((current, reason) => addFreeze(current, reason), run);
}

describe('run configuration', () => {
  it('uses the locked boss cadence, banner hold, and color order', () => {
    expect(BOSS_INTERVAL_MS).toBe(300_000);
    expect(BOSS_BANNER_MS).toBe(2_500);
    expect(BOSS_COLORS).toEqual(['purple', 'green', 'orange']);
    expect(POINTS_PER_SECOND).toBe(1);
  });

  it('uses the locked timeline geometry', () => {
    expect(TIMELINE_WIDTH_PX).toBe(320);
    expect(TIMELINE_WINDOW_MS).toBe(600_000);
    expect(PLAYHEAD_X_PX).toBe(160);
    expect(NODE_CLIP_PAD_PX).toBe(12);
  });
});

describe('createRun', () => {
  it('creates an active zeroed run with no freeze, banner, or commit', () => {
    const run = createTestRun(77);

    expect(run).toEqual({
      seed: 77,
      status: 'active',
      elapsedMs: 0,
      deathAtMs: null,
      freezeReasons: [],
      nextBossIndex: 1,
      banner: null,
      commit: 'none',
    });
  });
});

describe('advanceRun', () => {
  it('adds a floored integer delta', () => {
    const run = advanceRun(createTestRun(), 1_234.9);

    expect(run.elapsedMs).toBe(1_234);
    expect(run.status).toBe('active');
  });

  it('returns the same state for zero, negative, fractional, or non-finite deltas', () => {
    const run = createTestRun();

    expect(advanceRun(run, 0)).toBe(run);
    expect(advanceRun(run, -1)).toBe(run);
    expect(advanceRun(run, 0.9)).toBe(run);
    expect(advanceRun(run, Number.NaN)).toBe(run);
    expect(advanceRun(run, Number.POSITIVE_INFINITY)).toBe(run);
    expect(advanceRun(run, Number.NEGATIVE_INFINITY)).toBe(run);
  });

  it('does not advance a frozen run', () => {
    const frozen = addFreeze(createTestRun(), 'pause');

    expect(advanceRun(frozen, 1_000)).toBe(frozen);
  });

  it('does not advance an over run', () => {
    const over = endRun(advanceTo(500), 500);

    expect(advanceRun(over, 1_000)).toBe(over);
  });
});

describe('formatElapsed', () => {
  it('derives points at the one-second boundary', () => {
    expect(formatElapsed(999).points).toBe(0);
    expect(formatElapsed(1_000).points).toBe(1);
    expect(formatElapsed(1_999).points).toBe(1);
    expect(formatElapsed(59_999).points).toBe(59);
    expect(formatElapsed(60_000).points).toBe(60);
  });

  it('formats a truncated mm:ss:cc clock', () => {
    expect(formatElapsed(0)).toEqual({
      elapsedMs: 0,
      minutes: 0,
      seconds: 0,
      centiseconds: 0,
      text: '00:00:00',
      points: 0,
    });
    expect(formatElapsed(999).text).toBe('00:00:99');
    expect(formatElapsed(1_000).text).toBe('00:01:00');
    expect(formatElapsed(1_999).text).toBe('00:01:99');
    expect(formatElapsed(59_999).text).toBe('00:59:99');
    expect(formatElapsed(60_000).text).toBe('01:00:00');
    expect(formatElapsed(6_000_000)).toEqual({
      elapsedMs: 6_000_000,
      minutes: 100,
      seconds: 0,
      centiseconds: 0,
      text: '100:00:00',
      points: 6_000,
    });
  });

  it('never produces a centisecond value of 100', () => {
    for (const elapsedMs of [0, 9, 10, 99, 999, 1_999, 59_999, 60_000, 6_000_000]) {
      const clock = formatElapsed(elapsedMs);

      expect(clock.centiseconds).toBeGreaterThanOrEqual(0);
      expect(clock.centiseconds).toBeLessThanOrEqual(99);
    }
  });
});

describe('freeze stack', () => {
  it('keeps reasons unique and in canonical order', () => {
    const run = freezeRun(createTestRun(), 'focus', 'portrait', 'hidden', 'pause');

    expect(run.freezeReasons).toEqual(['pause', 'hidden', 'portrait', 'focus']);
  });

  it('is idempotent when adding or removing reasons', () => {
    const run = createTestRun();
    const paused = addFreeze(run, 'pause');

    expect(addFreeze(paused, 'pause')).toBe(paused);
    expect(removeFreeze(run, 'pause')).toBe(run);
    expect(removeFreeze(paused, 'pause').freezeReasons).toEqual([]);
  });

  it('keeps the run frozen while any reason remains', () => {
    const both = freezeRun(createTestRun(), 'pause', 'hidden');

    expect(advanceRun(both, 1_000)).toBe(both);

    const pausedOnly = removeFreeze(both, 'hidden');

    expect(pausedOnly.freezeReasons).toEqual(['pause']);
    expect(advanceRun(pausedOnly, 1_000)).toBe(pausedOnly);

    const active = removeFreeze(pausedOnly, 'pause');

    expect(advanceRun(active, 1_000).elapsedMs).toBe(1_000);
  });

  it('adds focus without opening the pause menu', () => {
    const focused = addFreeze(createTestRun(), 'focus');

    expect(focused.freezeReasons).toEqual(['focus']);
    expect(advanceRun(focused, 1_000)).toBe(focused);
    expect(resume(focused)).toBe(focused);
    expect(removeFreeze(focused, 'focus').freezeReasons).toEqual([]);
  });

  it('stays paused after a hidden tab and focus both return', () => {
    const run = freezeRun(createTestRun(), 'hidden', 'focus', 'pause');
    const hiddenReturned = removeFreeze(run, 'hidden');
    const focusReturned = removeFreeze(hiddenReturned, 'focus');

    expect(focusReturned.freezeReasons).toEqual(['pause']);
    expect(advanceRun(focusReturned, 1_000)).toBe(focusReturned);
  });

  it('stays paused after portrait return adds the pause reason', () => {
    const portrait = addFreeze(createTestRun(), 'portrait');
    const landscape = openPause(removeFreeze(portrait, 'portrait'));

    expect(landscape.freezeReasons).toEqual(['pause']);
    expect(advanceRun(landscape, 1_000)).toBe(landscape);
  });
});

describe('pause and resume', () => {
  it('opens the pause reason once and resumes explicitly', () => {
    const paused = openPause(createTestRun());

    expect(paused.freezeReasons).toEqual(['pause']);
    expect(openPause(paused)).toBe(paused);

    const resumed = resume(paused);

    expect(resumed.freezeReasons).toEqual([]);
    expect(advanceRun(resumed, 250).elapsedMs).toBe(250);
    expect(resume(resumed)).toBe(resumed);
  });

  it('does not change an over run', () => {
    const over = endRun(createTestRun(), 0);

    expect(addFreeze(over, 'pause')).toBe(over);
    expect(removeFreeze(over, 'pause')).toBe(over);
    expect(openPause(over)).toBe(over);
    expect(resume(over)).toBe(over);
  });
});

describe('boss banner', () => {
  it('starts the first banner at 300,000 ms with its full hold', () => {
    const before = advanceTo(BOSS_INTERVAL_MS - 1);

    expect(before.banner).toBeNull();
    expect(before.nextBossIndex).toBe(1);

    const run = advanceRun(before, 1);

    expect(run.elapsedMs).toBe(BOSS_INTERVAL_MS);
    expect(run.nextBossIndex).toBe(2);
    expect(run.banner).toEqual({
      bossIndex: 1,
      color: 'purple',
      durationMs: BOSS_BANNER_MS,
      remainingMs: BOSS_BANNER_MS,
    });
  });

  it('ticks the banner with active time without freezing the run', () => {
    const started = advanceTo(BOSS_INTERVAL_MS);
    const ticked = advanceRun(started, 1_000);

    expect(ticked.elapsedMs).toBe(301_000);
    expect(formatElapsed(ticked.elapsedMs).points).toBe(301);
    expect(ticked.banner).toEqual({
      bossIndex: 1,
      color: 'purple',
      durationMs: BOSS_BANNER_MS,
      remainingMs: 1_500,
    });
  });

  it('clears the banner when its remaining active time reaches zero', () => {
    const started = advanceTo(BOSS_INTERVAL_MS);
    const expired = advanceRun(started, BOSS_BANNER_MS);

    expect(expired.elapsedMs).toBe(302_500);
    expect(expired.banner).toBeNull();
    expect(expired.nextBossIndex).toBe(2);
  });

  it('cycles boss colors purple, green, orange, purple', () => {
    let run = advanceTo(BOSS_INTERVAL_MS);

    expect(run.banner?.color).toBe('purple');

    run = advanceRun(run, BOSS_BANNER_MS);
    run = advanceRun(run, BOSS_INTERVAL_MS - BOSS_BANNER_MS);

    expect(run.elapsedMs).toBe(600_000);
    expect(run.banner?.color).toBe('green');

    run = advanceRun(run, BOSS_BANNER_MS);
    run = advanceRun(run, BOSS_INTERVAL_MS - BOSS_BANNER_MS);

    expect(run.elapsedMs).toBe(900_000);
    expect(run.banner?.color).toBe('orange');

    run = advanceRun(run, BOSS_BANNER_MS);
    run = advanceRun(run, BOSS_INTERVAL_MS - BOSS_BANNER_MS);

    expect(run.elapsedMs).toBe(1_200_000);
    expect(run.banner?.bossIndex).toBe(4);
    expect(run.banner?.color).toBe('purple');
  });

  it('shows only the latest crossed boss for one large delta', () => {
    const run = advanceRun(createTestRun(), BOSS_INTERVAL_MS * 3);

    expect(run.elapsedMs).toBe(900_000);
    expect(formatElapsed(run.elapsedMs).points).toBe(900);
    expect(run.banner).toEqual({
      bossIndex: 3,
      color: 'orange',
      durationMs: BOSS_BANNER_MS,
      remainingMs: BOSS_BANNER_MS,
    });
    expect(run.nextBossIndex).toBe(4);
  });

  it('delays a boss mark while frozen and starts the full banner on resume', () => {
    const before = advanceTo(BOSS_INTERVAL_MS - 10);
    const frozen = addFreeze(before, 'pause');

    expect(advanceRun(frozen, 1_000)).toBe(frozen);
    expect(frozen.elapsedMs).toBe(299_990);
    expect(frozen.banner).toBeNull();

    const resumed = advanceRun(removeFreeze(frozen, 'pause'), 10);

    expect(resumed.elapsedMs).toBe(300_000);
    expect(resumed.banner?.remainingMs).toBe(BOSS_BANNER_MS);
  });

  it('preserves the remaining banner time across a freeze', () => {
    const partial = advanceRun(advanceTo(BOSS_INTERVAL_MS), 500);

    expect(partial.banner?.remainingMs).toBe(2_000);

    const frozen = addFreeze(partial, 'hidden');

    expect(advanceRun(frozen, 10_000)).toBe(frozen);
    expect(frozen.banner?.remainingMs).toBe(2_000);

    const resumed = advanceRun(removeFreeze(frozen, 'hidden'), 2_000);

    expect(resumed.elapsedMs).toBe(302_500);
    expect(resumed.banner).toBeNull();
  });

  it('does not tick a banner created exactly when the run freezes', () => {
    const started = advanceTo(BOSS_INTERVAL_MS);
    const frozen = addFreeze(started, 'portrait');

    expect(advanceRun(frozen, BOSS_BANNER_MS)).toBe(frozen);
    expect(frozen.banner?.remainingMs).toBe(BOSS_BANNER_MS);
  });
});

describe('endRun', () => {
  it('ends the run once with frozen values and a pending commit', () => {
    const run = advanceTo(1_234);
    const over = endRun(run, 1_234);

    expect(over).toEqual({
      ...run,
      status: 'over',
      elapsedMs: 1_234,
      deathAtMs: 1_234,
      freezeReasons: [],
      banner: null,
      commit: 'pending',
    });
    expect(formatElapsed(over.elapsedMs).points).toBe(1);
  });

  it('scores a death at 999 ms as zero points and at 1,000 ms as one', () => {
    expect(formatElapsed(endRun(advanceTo(999), 999).elapsedMs).points).toBe(0);
    expect(formatElapsed(endRun(advanceTo(1_000), 1_000).elapsedMs).points).toBe(1);
  });

  it('clamps, floors, and truncates the death time', () => {
    const beyond = endRun(advanceTo(1_250), 9_999);

    expect(beyond.deathAtMs).toBe(1_250);
    expect(beyond.elapsedMs).toBe(1_250);

    const negative = endRun(advanceTo(1_250), -50);

    expect(negative.deathAtMs).toBe(0);
    expect(negative.elapsedMs).toBe(0);

    const fractional = endRun(advanceTo(1_250), 999.9);

    expect(fractional.deathAtMs).toBe(999);
    expect(fractional.elapsedMs).toBe(999);
  });

  it('clears the banner and all freeze reasons', () => {
    const withBanner = advanceTo(BOSS_INTERVAL_MS);
    const frozen = addFreeze(withBanner, 'pause');
    const over = endRun(frozen, BOSS_INTERVAL_MS);

    expect(over.banner).toBeNull();
    expect(over.freezeReasons).toEqual([]);
    expect(over.deathAtMs).toBe(BOSS_INTERVAL_MS);
  });

  it('ends a zero-length run', () => {
    const over = endRun(createTestRun(), 0);

    expect(over.status).toBe('over');
    expect(over.elapsedMs).toBe(0);
    expect(over.deathAtMs).toBe(0);
    expect(over.commit).toBe('pending');
  });

  it('ignores a repeated death', () => {
    const over = endRun(advanceTo(1_000), 1_000);

    expect(endRun(over, 500)).toBe(over);
  });
});

describe('settleCommit', () => {
  it('settles a pending death commit to each terminal outcome', () => {
    const over = endRun(advanceTo(1_000), 1_000);

    for (const outcome of ['saved', 'failed', 'unreadable', 'unavailable'] as const) {
      const settled = settleCommit(over, outcome);

      expect(settled.commit).toBe(outcome);
      expect(settled.elapsedMs).toBe(over.elapsedMs);
      expect(settled.deathAtMs).toBe(over.deathAtMs);
    }
  });

  it('ignores settlement before a death', () => {
    const run = createTestRun();

    expect(settleCommit(run, 'saved')).toBe(run);
    expect(settleCommit(run, 'failed')).toBe(run);
  });

  it('ignores settlement after a commit has settled', () => {
    const saved = settleCommit(endRun(advanceTo(1_000), 1_000), 'saved');

    expect(settleCommit(saved, 'failed')).toBe(saved);
    expect(settleCommit(saved, 'saved')).toBe(saved);
  });
});

describe('retryCommit', () => {
  it('moves a failed commit back to pending', () => {
    const failed = settleCommit(endRun(advanceTo(1_000), 1_000), 'failed');
    const retried = retryCommit(failed);

    expect(retried.commit).toBe('pending');
    expect(retried).not.toBe(failed);
    expect(retried.elapsedMs).toBe(failed.elapsedMs);
    expect(retried.deathAtMs).toBe(failed.deathAtMs);
  });

  it('is a no-op for every status other than failed', () => {
    const pending = endRun(advanceTo(1_000), 1_000);
    const saved = settleCommit(pending, 'saved');
    const unreadable = settleCommit(pending, 'unreadable');
    const unavailable = settleCommit(pending, 'unavailable');
    const none = createTestRun();

    expect(retryCommit(none)).toBe(none);
    expect(retryCommit(pending)).toBe(pending);
    expect(retryCommit(saved)).toBe(saved);
    expect(retryCommit(unreadable)).toBe(unreadable);
    expect(retryCommit(unavailable)).toBe(unavailable);
  });

  it('supports the failed -> pending -> saved retry flow', () => {
    const failed = settleCommit(endRun(advanceTo(1_000), 1_000), 'failed');
    const pending = retryCommit(failed);
    const saved = settleCommit(pending, 'saved');

    expect(pending.commit).toBe('pending');
    expect(saved.commit).toBe('saved');
    expect(saved.elapsedMs).toBe(failed.elapsedMs);
    expect(saved.deathAtMs).toBe(failed.deathAtMs);
    expect(settleCommit(saved, 'failed')).toBe(saved);
  });
});
