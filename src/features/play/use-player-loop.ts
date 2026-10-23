import { useEffect, useLayoutEffect, useRef } from 'react';

import { clampPlayerToBounds, createPlayer, stepPlayer } from '@/game/player';
import type { Bounds, MovementInput, PlayerState, PlayerStats } from '@/game/player';

import type { JoystickState } from './use-touch-joystick';
import type { RefObject } from 'react';

const MAX_FRAME_SECONDS = 0.05;

interface UsePlayerLoopOptions {
  readonly playfieldRef: RefObject<HTMLDivElement | null>;
  readonly playerRef: RefObject<HTMLDivElement | null>;
  readonly keyboardInputRef: RefObject<MovementInput>;
  readonly joystickStateRef: RefObject<JoystickState | null>;
  readonly joystickInputRef: RefObject<MovementInput>;
  readonly running: boolean;
  readonly stats: PlayerStats;
}

export function usePlayerLoop({
  playfieldRef,
  playerRef,
  keyboardInputRef,
  joystickStateRef,
  joystickInputRef,
  running,
  stats,
}: UsePlayerLoopOptions): void {
  const playerStateRef = useRef<PlayerState | null>(null);
  const boundsRef = useRef<Bounds>({ left: 0, top: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const playfield = playfieldRef.current;

    if (playfield === null) {
      return;
    }

    const measure = () => {
      const rect = playfield.getBoundingClientRect();
      const viewport = window.visualViewport ?? null;
      const left = viewport === null ? 0 : Math.max(0, viewport.offsetLeft - rect.left);
      const top = viewport === null ? 0 : Math.max(0, viewport.offsetTop - rect.top);
      const viewportRight =
        viewport === null
          ? Number.POSITIVE_INFINITY
          : viewport.offsetLeft + viewport.width - rect.left;
      const viewportBottom =
        viewport === null
          ? Number.POSITIVE_INFINITY
          : viewport.offsetTop + viewport.height - rect.top;
      const documentWidth = document.documentElement.clientWidth;
      const documentHeight = document.documentElement.clientHeight;
      const right = Math.min(
        rect.width,
        documentWidth > 0 ? documentWidth - rect.left : Number.POSITIVE_INFINITY,
        viewportRight,
      );
      const bottom = Math.min(
        rect.height,
        documentHeight > 0 ? documentHeight - rect.top : Number.POSITIVE_INFINITY,
        viewportBottom,
      );
      const bounds: Bounds = {
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      };

      boundsRef.current = bounds;
      const current = playerStateRef.current;
      const next =
        current === null ? createPlayer(stats, bounds) : clampPlayerToBounds(current, bounds);

      playerStateRef.current = next;
      writePlayerTransform(playerRef.current, next);
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    document.addEventListener('fullscreenchange', measure);

    const viewport = window.visualViewport ?? null;
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      document.removeEventListener('fullscreenchange', measure);
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
    };
  }, [playfieldRef, playerRef, stats]);

  useEffect(() => {
    if (!running) {
      return;
    }

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(Math.max((now - previous) / 1000, 0), MAX_FRAME_SECONDS);
      previous = now;
      const current = playerStateRef.current;

      if (current !== null) {
        const input =
          joystickStateRef.current !== null ? joystickInputRef.current : keyboardInputRef.current;
        const next = stepPlayer(current, input, dt, boundsRef.current);

        playerStateRef.current = next;
        writePlayerTransform(playerRef.current, next);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [keyboardInputRef, joystickInputRef, joystickStateRef, playerRef, running]);
}

function writePlayerTransform(element: HTMLDivElement | null, player: PlayerState): void {
  if (element === null) {
    return;
  }

  const x = player.x - player.size / 2;
  const y = player.y - player.size / 2;

  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
