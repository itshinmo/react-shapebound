import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

import { formatElapsed } from '@/game/run';
import type { RunState } from '@/game/run';

export interface RunTimerHandle {
  write(run: RunState): void;
}

export const RunTimer = forwardRef<RunTimerHandle>(function RunTimer(_props, ref) {
  const timerRef = useRef<HTMLSpanElement>(null);
  const pointsGroupRef = useRef<HTMLDivElement>(null);
  const pointsRowRef = useRef<HTMLDivElement>(null);
  const pointsCountRef = useRef<HTMLSpanElement>(null);

  const write = useCallback((run: RunState) => {
    const clock = formatElapsed(run.elapsedMs);
    const timer = timerRef.current;

    if (timer !== null) {
      timer.textContent = clock.text;
    }

    const group = pointsGroupRef.current;

    if (group !== null) {
      group.setAttribute('aria-label', `Blue points: ${clock.points}`);
    }

    const count = pointsCountRef.current;

    if (count !== null) {
      count.textContent = String(clock.points);
    }

    pointsRowRef.current?.classList.toggle('invisible', clock.points === 0);
  }, []);

  useImperativeHandle(ref, () => ({ write }), [write]);

  return (
    <div data-testid="run-timer-block" className="font-mono">
      <p className="text-[0.5rem] tracking-[0.2em] text-muted uppercase">RUN TIME</p>
      <span
        ref={timerRef}
        role="timer"
        aria-live="off"
        data-testid="run-timer"
        className="block text-[1.02rem] leading-none text-ink tabular-nums"
      >
        00:00:00
      </span>
      <div ref={pointsGroupRef} role="group" aria-label="Blue points: 0" data-testid="run-points">
        <div
          ref={pointsRowRef}
          aria-hidden="true"
          data-testid="run-points-row"
          className="invisible flex min-h-[0.8rem] items-center gap-1 text-[0.68rem] leading-none text-ink"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-survival clip-diamond" />
          <span aria-hidden="true">:</span>
          <span ref={pointsCountRef} className="tabular-nums">
            0
          </span>
        </div>
      </div>
    </div>
  );
});
