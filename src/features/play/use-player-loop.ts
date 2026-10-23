import { useEffect, useLayoutEffect, useRef } from 'react';

import { clampPlayerToBounds, createPlayer, stepPlayer } from '@/game/player';
import type { Bounds, MovementInput, PlayerState, PlayerStats } from '@/game/player';

import type { JoystickState } from './use-touch-joystick';
import type { RefObject } from 'react';

const MAX_FRAME_SECONDS = 0.05;

interface UsePlayerLoopOptions {
  readonly arenaRef: RefObject<HTMLDivElement | null>;
  readonly playerRef: RefObject<HTMLDivElement | null>;
  readonly keyboardInputRef: RefObject<MovementInput>;
  readonly joystickStateRef: RefObject<JoystickState | null>;
  readonly joystickInputRef: RefObject<MovementInput>;
  readonly running: boolean;
  readonly stats: PlayerStats;
  readonly containerSize: number;
}

export function usePlayerLoop({
  arenaRef,
  playerRef,
  keyboardInputRef,
  joystickStateRef,
  joystickInputRef,
  running,
  stats,
  containerSize,
}: UsePlayerLoopOptions): void {
  const playerStateRef = useRef<PlayerState | null>(null);
  const boundsRef = useRef<Bounds>({ left: 0, top: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const arena = arenaRef.current;

    if (arena === null) {
      return;
    }

    const rect = arena.getBoundingClientRect();
    const bounds: Bounds = {
      left: 0,
      top: 0,
      width: Math.min(rect.width, containerSize),
      height: Math.min(rect.height, containerSize),
    };
    const current = playerStateRef.current;
    const next =
      current === null ? createPlayer(stats, bounds) : clampPlayerToBounds(current, bounds);

    boundsRef.current = bounds;
    playerStateRef.current = next;
    writePlayerTransform(playerRef.current, next);
  }, [arenaRef, containerSize, playerRef, stats]);

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
