import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

import type { RunState } from '@/game/run';

import { BossBanner } from './boss-banner';
import { RunTimeline } from './run-timeline';
import { RunTimer } from './run-timer';

import type { RunTimelineHandle } from './run-timeline';
import type { RunTimerHandle } from './run-timer';
import type { RunBannerSnapshot } from './use-run-loop';

const STRIP_HEIGHT_CLASS = 'h-[calc(env(safe-area-inset-top)_+_5.5rem)]';
const CENTER_TOP_CLASS = 'top-[calc(env(safe-area-inset-top)_+_0.5rem)]';

export interface RunHudHandle {
  write(run: RunState): void;
  setArenaTop(topPx: number): void;
  focusPauseButton(): void;
}

interface RunHudProps {
  readonly banner: RunBannerSnapshot | null;
  readonly isPaused: boolean;
  readonly showPause: boolean;
  readonly onPause: () => void;
}

export const RunHud = forwardRef<RunHudHandle, RunHudProps>(function RunHud(
  { banner, isPaused, showPause, onPause },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<RunTimerHandle>(null);
  const timelineRef = useRef<RunTimelineHandle>(null);
  const pauseButtonRef = useRef<HTMLButtonElement>(null);

  const write = useCallback((run: RunState) => {
    timerRef.current?.write(run);
    timelineRef.current?.write(run);
  }, []);

  const setArenaTop = useCallback((topPx: number) => {
    rootRef.current?.style.setProperty('--arena-top', `${Math.max(0, topPx)}px`);
  }, []);

  const focusPauseButton = useCallback(() => {
    pauseButtonRef.current?.focus({ preventScroll: true });
  }, []);

  useImperativeHandle(ref, () => ({ write, setArenaTop, focusPauseButton }), [
    write,
    setArenaTop,
    focusPauseButton,
  ]);

  return (
    <div
      ref={rootRef}
      data-run-hud=""
      data-testid="run-hud"
      className="pointer-events-none absolute inset-x-0 top-0 z-30 pt-[calc(env(safe-area-inset-top)_+_0.5rem)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]"
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-void/85 via-void/45 to-transparent ${STRIP_HEIGHT_CLASS}`}
      />

      <div
        aria-hidden="true"
        data-run-hud-no-joystick=""
        data-testid="hud-no-joystick"
        className={`pointer-events-auto absolute inset-x-0 top-0 ${STRIP_HEIGHT_CLASS}`}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      />

      <div className="relative z-20 w-fit">
        <RunTimer ref={timerRef} />
      </div>

      <div
        data-run-hud-timeline=""
        className={`absolute left-1/2 z-0 w-80 -translate-x-1/2 ${CENTER_TOP_CLASS}`}
      >
        <RunTimeline ref={timelineRef} dimmed={banner !== null} />
      </div>

      {showPause ? (
        <button
          ref={pauseButtonRef}
          type="button"
          aria-label="Pause menu"
          aria-expanded={isPaused}
          aria-controls="pause-menu"
          data-testid="pause-button"
          onClick={onPause}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          className="pointer-events-auto clip-border absolute top-[calc(env(safe-area-inset-top)_+_0.5rem)] right-[max(1rem,env(safe-area-inset-right))] z-30 flex size-11 items-center justify-center text-ink transition-colors duration-150 ease-snap [--clip-border:var(--color-line-bright)] [--clip-fill:var(--color-void)] clip-corner-sm hover:text-cyan hover:[--clip-border:var(--color-cyan)] focus-visible:outline-none focus-visible:[--clip-border-width:2px] focus-visible:[--clip-border:var(--color-cyan)]"
        >
          <span aria-hidden="true" data-testid="pause-glyph" className="flex gap-1">
            <span className="h-3.5 w-1 bg-current" />
            <span className="h-3.5 w-1 bg-current" />
          </span>
        </button>
      ) : null}

      {banner !== null ? <BossBanner key={banner.bossIndex} banner={banner} /> : null}
    </div>
  );
});
