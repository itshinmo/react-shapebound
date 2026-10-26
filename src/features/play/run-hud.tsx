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
}

interface RunHudProps {
  readonly banner: RunBannerSnapshot | null;
}

export const RunHud = forwardRef<RunHudHandle, RunHudProps>(function RunHud({ banner }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<RunTimerHandle>(null);
  const timelineRef = useRef<RunTimelineHandle>(null);

  const write = useCallback((run: RunState) => {
    timerRef.current?.write(run);
    timelineRef.current?.write(run);
  }, []);

  const setArenaTop = useCallback((topPx: number) => {
    rootRef.current?.style.setProperty('--arena-top', `${Math.max(0, topPx)}px`);
  }, []);

  useImperativeHandle(ref, () => ({ write, setArenaTop }), [write, setArenaTop]);

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

      {banner !== null ? <BossBanner key={banner.bossIndex} banner={banner} /> : null}
    </div>
  );
});
