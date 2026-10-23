import { useCallback, useEffect, useRef, useState } from 'react';

import { PLAYER_BASE_STATS, PLAYER_CONTAINER_SIZE } from '@/game/player';

import { isTouchDevice } from './is-touch-device';
import { LandscapeGate } from './landscape-gate';
import { releaseLandscapeLock, requestLandscapeLock } from './orientation-lock';
import { PlayerContainer } from './player-container';
import { PlayerSquare } from './player-square';
import { StartOverlay } from './start-overlay';
import { TouchJoystick } from './touch-joystick';
import { useKeyboardInput } from './use-keyboard-input';
import { usePlayerLoop } from './use-player-loop';
import { useTouchJoystick } from './use-touch-joystick';

export function PlayScreen() {
  return (
    <LandscapeGate>
      <PlaySurface />
    </LandscapeGate>
  );
}

function PlaySurface() {
  const boardRef = useRef<HTMLElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState<boolean>(() => !isTouchDevice());
  const [starting, setStarting] = useState(false);

  const keyboardInputRef = useKeyboardInput(started);
  const {
    state: joystickState,
    activeRef: joystickStateRef,
    vectorRef: joystickInputRef,
    knobRef: joystickKnobRef,
    pointerHandlers,
  } = useTouchJoystick(started);

  usePlayerLoop({
    arenaRef,
    playerRef,
    keyboardInputRef,
    joystickStateRef,
    joystickInputRef,
    running: started,
    stats: PLAYER_BASE_STATS,
    containerSize: PLAYER_CONTAINER_SIZE,
  });

  useEffect(() => {
    const board = boardRef.current;

    return () => {
      void releaseLandscapeLock(board).catch(() => undefined);
    };
  }, []);

  const handleStart = useCallback(() => {
    if (starting) {
      return;
    }

    setStarting(true);

    void requestLandscapeLock(boardRef.current)
      .catch(() => undefined)
      .finally(() => {
        setStarting(false);
        setStarted(true);
      });
  }, [starting]);

  return (
    <section
      ref={boardRef}
      aria-label="Play field"
      aria-describedby="play-instructions"
      className="fixed inset-0 touch-none overflow-hidden overscroll-none bg-void select-none"
      {...pointerHandlers}
    >
      <h1 className="sr-only">Play field</h1>
      <p id="play-instructions" className="sr-only">
        Move with W A S D or the arrow keys. On a touch screen, drag anywhere to use the joystick.
        Stay inside the outlined arena.
      </p>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-60" />

      <div className="absolute inset-0 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
        <div className="relative h-full w-full">
          <PlayerContainer arenaRef={arenaRef} size={PLAYER_CONTAINER_SIZE}>
            <PlayerSquare playerRef={playerRef} size={PLAYER_BASE_STATS.size} />
          </PlayerContainer>
        </div>
      </div>

      <TouchJoystick state={joystickState} knobRef={joystickKnobRef} />
      {started ? null : <StartOverlay onStart={handleStart} pending={starting} />}
    </section>
  );
}
