import { useCallback, useEffect, useRef, useState } from 'react';

import { commitProgression, type ProgressionData } from '@/game/progression';
import {
  addFreeze,
  advanceRun,
  createRun,
  endRun,
  openPause,
  removeFreeze,
  resume as resumeRun,
  retryCommit as retryPendingCommit,
  settleCommit,
} from '@/game/run';
import type { BossColor, CommitStatus, FreezeReason, RunState, RunStatus } from '@/game/run';
import type { SaveEnvelope, SaveParseError } from '@/game/save';

import type { ProgressionStorage } from './progression-storage';
import type { RefObject } from 'react';

const MAX_FRAME_MS = 50;
const FIXED_STEP_MS = 20;
const MAX_FIXED_STEPS_PER_FRAME = 3;

export interface RunBannerSnapshot {
  readonly bossIndex: number;
  readonly color: BossColor;
}

export interface RunSnapshot {
  readonly seed: number;
  readonly status: RunStatus;
  readonly freezeReasons: readonly FreezeReason[];
  readonly banner: RunBannerSnapshot | null;
  readonly commit: CommitStatus;
  readonly deathAtMs: number | null;
}

export interface RunFrame {
  readonly run: RunState;
  readonly activeMs: number;
  readonly fixedStepEndsMs: readonly number[];
}

export type RunFrameResult =
  | { readonly playerAlive: true; readonly deathAtMs: null }
  | { readonly playerAlive: false; readonly deathAtMs: number };

export interface UseRunLoopOptions {
  readonly running: boolean;
  readonly initialSeed: number;
  readonly createSeed: () => number;
  readonly storage: ProgressionStorage;
  readonly onFrame: (frame: RunFrame) => RunFrameResult;
  readonly onReset?: (seed: number) => void;
  readonly portrait?: boolean;
  readonly savedAt?: () => string;
}

export interface UseRunLoopResult {
  readonly runRef: RefObject<RunState>;
  readonly snapshot: RunSnapshot;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly restart: () => void;
  readonly retry: () => void;
  readonly retryCommit: () => void;
  readonly committedData: ProgressionData | null;
  readonly commitReason: SaveParseError | null;
}

export function useRunLoop({
  running,
  initialSeed,
  createSeed,
  storage,
  onFrame,
  onReset,
  portrait = false,
  savedAt = defaultSavedAt,
}: UseRunLoopOptions): UseRunLoopResult {
  const [initialRun] = useState(() => createRun(initialSeed));
  const runRef = useRef<RunState>(initialRun);
  const [snapshot, setSnapshot] = useState<RunSnapshot>(() => toSnapshot(initialRun));
  const snapshotRef = useRef<RunSnapshot>(snapshot);
  const [committedData, setCommittedData] = useState<ProgressionData | null>(null);
  const [commitReason, setCommitReason] = useState<SaveParseError | null>(null);
  const [commitRequest, setCommitRequest] = useState(0);
  const commitRequestRef = useRef(0);
  const latchedEnvelopeRef = useRef<SaveEnvelope<ProgressionData> | null>(null);
  const frameRemainderRef = useRef(0);
  const stepAccumulatorRef = useRef(0);
  const nextStepEndRef = useRef(FIXED_STEP_MS);
  const [epoch, setEpoch] = useState(0);

  const onFrameRef = useRef(onFrame);
  const storageRef = useRef(storage);
  const savedAtRef = useRef(savedAt);
  const createSeedRef = useRef(createSeed);
  const onResetRef = useRef(onReset);
  const wasPortraitRef = useRef(false);

  useEffect(() => {
    onFrameRef.current = onFrame;
    storageRef.current = storage;
    savedAtRef.current = savedAt;
    createSeedRef.current = createSeed;
    onResetRef.current = onReset;
  });

  const publish = useCallback((run: RunState) => {
    const next = toSnapshot(run);

    if (sameSnapshot(snapshotRef.current, next)) {
      return;
    }

    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const applyRun = useCallback(
    (next: RunState) => {
      if (next === runRef.current) {
        return;
      }

      runRef.current = next;
      publish(next);
    },
    [publish],
  );

  const pause = useCallback(() => {
    applyRun(openPause(runRef.current));
  }, [applyRun]);

  const resume = useCallback(() => {
    applyRun(resumeRun(runRef.current));
  }, [applyRun]);

  const resetRun = useCallback(() => {
    const seed = createSeedRef.current();
    const fresh = createRun(seed);

    runRef.current = fresh;
    latchedEnvelopeRef.current = null;
    frameRemainderRef.current = 0;
    stepAccumulatorRef.current = 0;
    nextStepEndRef.current = FIXED_STEP_MS;
    wasPortraitRef.current = portrait;
    setCommittedData(null);
    setCommitReason(null);
    setEpoch((value) => value + 1);
    publish(fresh);
    onResetRef.current?.(seed);
  }, [portrait, publish]);

  const commitDeath = useCallback(() => {
    const run = runRef.current;

    if (run.status !== 'over' || run.deathAtMs === null || run.commit !== 'pending') {
      return;
    }

    const read = storageRef.current.read();
    const readable = read.kind === 'none' || read.kind === 'valid';
    const result = commitProgression(read, {
      runPoints: Math.floor(run.deathAtMs / 1_000),
      deathAtMs: run.deathAtMs,
      savedAt: readable ? savedAtRef.current() : '',
    });

    if (result.kind === 'ready') {
      latchedEnvelopeRef.current = result.envelope;
      const written = storageRef.current.write(result.envelope);
      const next = settleCommit(run, written ? 'saved' : 'failed');

      runRef.current = next;
      publish(next);

      if (written) {
        setCommittedData(result.data);
      }

      return;
    }

    if (result.kind === 'unreadable') {
      const next = settleCommit(run, 'unreadable');

      runRef.current = next;
      publish(next);
      setCommitReason(result.reason);
      return;
    }

    const next = settleCommit(run, 'unavailable');

    runRef.current = next;
    publish(next);
  }, [publish]);

  const retryCommit = useCallback(() => {
    const run = runRef.current;
    const envelope = latchedEnvelopeRef.current;

    if (run.commit !== 'failed' || envelope === null) {
      return;
    }

    const pending = retryPendingCommit(run);
    const written = storageRef.current.write(envelope);
    const next = settleCommit(pending, written ? 'saved' : 'failed');

    runRef.current = next;
    publish(next);

    if (written) {
      setCommittedData(envelope.data);
    }
  }, [publish]);

  useEffect(() => {
    if (commitRequest === 0 || commitRequestRef.current === commitRequest) {
      return;
    }

    commitRequestRef.current = commitRequest;
    commitDeath();
  }, [commitDeath, commitRequest]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const add = (reason: FreezeReason) => {
      applyRun(addFreeze(runRef.current, reason));
    };

    const remove = (reason: FreezeReason) => {
      applyRun(removeFreeze(runRef.current, reason));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        add('hidden');
      } else {
        remove('hidden');
      }
    };

    const onBlur = () => {
      if (document.visibilityState === 'visible') {
        add('focus');
      }
    };

    const onFocus = () => {
      remove('focus');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    onVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [applyRun, running]);

  useEffect(() => {
    if (!running) {
      wasPortraitRef.current = portrait;
      return;
    }

    if (portrait) {
      wasPortraitRef.current = true;
      applyRun(addFreeze(runRef.current, 'portrait'));
      return;
    }

    if (!wasPortraitRef.current) {
      return;
    }

    wasPortraitRef.current = false;
    applyRun(openPause(removeFreeze(runRef.current, 'portrait')));
  }, [applyRun, epoch, portrait, running]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const current = runRef.current;

    if (current.status !== 'active' || current.freezeReasons.length > 0) {
      return;
    }

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const rawDeltaMs = Math.min(Math.max(now - previous, 0), MAX_FRAME_MS);

      previous = now;

      const scaledDeltaMs = rawDeltaMs + frameRemainderRef.current;
      const activeMs = Math.floor(scaledDeltaMs);

      frameRemainderRef.current = scaledDeltaMs - activeMs;

      if (activeMs > 0) {
        const live = runRef.current;

        if (live.status !== 'active' || live.freezeReasons.length > 0) {
          return;
        }

        const advanced = advanceRun(live, activeMs);

        runRef.current = advanced;
        publish(advanced);

        stepAccumulatorRef.current += activeMs;
        const fixedStepEndsMs: number[] = [];

        while (
          stepAccumulatorRef.current >= FIXED_STEP_MS &&
          fixedStepEndsMs.length < MAX_FIXED_STEPS_PER_FRAME
        ) {
          stepAccumulatorRef.current -= FIXED_STEP_MS;
          fixedStepEndsMs.push(nextStepEndRef.current);
          nextStepEndRef.current += FIXED_STEP_MS;
        }

        const result = onFrameRef.current({
          run: advanced,
          activeMs,
          fixedStepEndsMs,
        });

        if (!result.playerAlive) {
          const over = endRun(runRef.current, result.deathAtMs);

          runRef.current = over;
          publish(over);
          setCommitRequest((value) => value + 1);
          return;
        }

        if (runRef.current.status !== 'active' || runRef.current.freezeReasons.length > 0) {
          return;
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [epoch, publish, running, snapshot.freezeReasons.length, snapshot.status]);

  return {
    runRef,
    snapshot,
    pause,
    resume,
    restart: resetRun,
    retry: resetRun,
    retryCommit,
    committedData,
    commitReason,
  };
}

function defaultSavedAt(): string {
  return new Date().toISOString();
}

function toSnapshot(run: RunState): RunSnapshot {
  return {
    seed: run.seed,
    status: run.status,
    freezeReasons: run.freezeReasons,
    banner:
      run.banner === null
        ? null
        : {
            bossIndex: run.banner.bossIndex,
            color: run.banner.color,
          },
    commit: run.commit,
    deathAtMs: run.deathAtMs,
  };
}

function sameSnapshot(a: RunSnapshot, b: RunSnapshot): boolean {
  return (
    a.seed === b.seed &&
    a.status === b.status &&
    a.commit === b.commit &&
    a.deathAtMs === b.deathAtMs &&
    sameFreezeReasons(a.freezeReasons, b.freezeReasons) &&
    sameBanner(a.banner, b.banner)
  );
}

function sameFreezeReasons(a: readonly FreezeReason[], b: readonly FreezeReason[]): boolean {
  return a.length === b.length && a.every((reason, index) => reason === b[index]);
}

function sameBanner(a: RunBannerSnapshot | null, b: RunBannerSnapshot | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }

  return a.bossIndex === b.bossIndex && a.color === b.color;
}
