export type RunStatus = 'active' | 'over';
export type FreezeReason = 'pause' | 'hidden' | 'portrait' | 'focus';
export type BossColor = 'purple' | 'green' | 'orange';
export type CommitStatus = 'none' | 'pending' | 'saved' | 'failed' | 'unreadable' | 'unavailable';
export type CommitOutcome = 'saved' | 'failed' | 'unreadable' | 'unavailable';

export interface BossBanner {
  readonly bossIndex: number;
  readonly color: BossColor;
  readonly durationMs: number;
  readonly remainingMs: number;
}

export interface RunState {
  readonly seed: number;
  readonly status: RunStatus;
  readonly elapsedMs: number;
  readonly deathAtMs: number | null;
  readonly freezeReasons: readonly FreezeReason[];
  readonly nextBossIndex: number;
  readonly banner: BossBanner | null;
  readonly commit: CommitStatus;
}

export interface RunClock {
  readonly elapsedMs: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly centiseconds: number;
  readonly text: string;
  readonly points: number;
}

export const BOSS_INTERVAL_MS = 300_000;
export const BOSS_COLORS = ['purple', 'green', 'orange'] as const satisfies readonly BossColor[];
export const TIMELINE_WIDTH_PX = 320;
export const TIMELINE_WINDOW_MS = 600_000;
export const PLAYHEAD_X_PX = 160;
export const POINTS_PER_SECOND = 1;
export const BOSS_BANNER_MS = 2_500;
export const NODE_CLIP_PAD_PX = 12;

const FREEZE_ORDER: readonly FreezeReason[] = ['pause', 'hidden', 'portrait', 'focus'];

export function createRun(seed: number): RunState {
  return {
    seed,
    status: 'active',
    elapsedMs: 0,
    deathAtMs: null,
    freezeReasons: [],
    nextBossIndex: 1,
    banner: null,
    commit: 'none',
  };
}

export function advanceRun(run: RunState, dtMs: number): RunState {
  if (
    run.status !== 'active' ||
    run.freezeReasons.length > 0 ||
    !Number.isFinite(dtMs) ||
    dtMs <= 0
  ) {
    return run;
  }

  const deltaMs = Math.floor(dtMs);

  if (deltaMs <= 0) {
    return run;
  }

  const elapsedMs = run.elapsedMs + deltaMs;
  let banner = run.banner;
  let nextBossIndex = run.nextBossIndex;

  if (banner !== null) {
    const remainingMs = banner.remainingMs - deltaMs;
    banner = remainingMs > 0 ? { ...banner, remainingMs } : null;
  }

  if (banner === null) {
    const bossIndex = Math.floor(elapsedMs / BOSS_INTERVAL_MS);

    if (bossIndex >= nextBossIndex) {
      banner = createBanner(bossIndex);
      nextBossIndex = bossIndex + 1;
    }
  }

  return {
    ...run,
    elapsedMs,
    nextBossIndex,
    banner,
  };
}

export function addFreeze(run: RunState, reason: FreezeReason): RunState {
  if (run.status !== 'active' || run.freezeReasons.includes(reason)) {
    return run;
  }

  return {
    ...run,
    freezeReasons: FREEZE_ORDER.filter(
      (candidate) => candidate === reason || run.freezeReasons.includes(candidate),
    ),
  };
}

export function removeFreeze(run: RunState, reason: FreezeReason): RunState {
  if (run.status !== 'active' || !run.freezeReasons.includes(reason)) {
    return run;
  }

  return {
    ...run,
    freezeReasons: run.freezeReasons.filter((candidate) => candidate !== reason),
  };
}

export function openPause(run: RunState): RunState {
  return addFreeze(run, 'pause');
}

export function resume(run: RunState): RunState {
  return removeFreeze(run, 'pause');
}

export function endRun(run: RunState, atMs: number): RunState {
  if (run.status !== 'active') {
    return run;
  }

  const requestedMs = Number.isFinite(atMs) ? Math.floor(atMs) : run.elapsedMs;
  const deathAtMs = Math.min(Math.max(requestedMs, 0), run.elapsedMs);

  return {
    ...run,
    status: 'over',
    elapsedMs: deathAtMs,
    deathAtMs,
    freezeReasons: [],
    banner: null,
    commit: 'pending',
  };
}

export function settleCommit(run: RunState, outcome: CommitOutcome): RunState {
  if (run.commit !== 'pending') {
    return run;
  }

  return {
    ...run,
    commit: outcome,
  };
}

export function retryCommit(run: RunState): RunState {
  if (run.commit !== 'failed') {
    return run;
  }

  return {
    ...run,
    commit: 'pending',
  };
}

export function formatElapsed(elapsedMs: number): RunClock {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs)) : 0;
  const minutes = Math.floor(safeElapsedMs / 60_000);
  const seconds = Math.floor(safeElapsedMs / 1_000) % 60;
  const centiseconds = Math.floor(safeElapsedMs / 10) % 100;

  return {
    elapsedMs: safeElapsedMs,
    minutes,
    seconds,
    centiseconds,
    text: `${pad(minutes)}:${pad(seconds)}:${pad(centiseconds)}`,
    points: Math.floor((safeElapsedMs * POINTS_PER_SECOND) / 1_000),
  };
}

function createBanner(bossIndex: number): BossBanner {
  const color = BOSS_COLORS[(bossIndex - 1) % BOSS_COLORS.length] ?? BOSS_COLORS[0];

  return {
    bossIndex,
    color,
    durationMs: BOSS_BANNER_MS,
    remainingMs: BOSS_BANNER_MS,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
