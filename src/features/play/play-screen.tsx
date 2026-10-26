import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { ViewportRect } from '@/game/enemy-spawn';
import { createEnemyWorld, stepEnemies } from '@/game/enemy-world';
import type { EnemyWorld } from '@/game/enemy-world';
import {
  PLAYER_BASE_STATS,
  PLAYER_CONTAINER_SIZE,
  applyDamage,
  clampPlayerToBounds,
  createPlayer,
  stepPlayer,
} from '@/game/player';
import type { Bounds, PlayerState } from '@/game/player';
import { createRun } from '@/game/run';
import { getBrowserStorage } from '@/shared/lib/storage';

import { EnemyLayer } from './enemy-layer';
import { isTouchDevice } from './is-touch-device';
import { LandscapeGate } from './landscape-gate';
import { releaseLandscapeLock, requestLandscapeLock } from './orientation-lock';
import { PlayerContainer } from './player-container';
import { PlayerSquare } from './player-square';
import { createProgressionStorage } from './progression-storage';
import { RunHud } from './run-hud';
import { createRunSeed } from './run-seed';
import { StartOverlay } from './start-overlay';
import { TouchJoystick } from './touch-joystick';
import { useKeyboardInput } from './use-keyboard-input';
import { useRunLoop } from './use-run-loop';
import { useTouchJoystick } from './use-touch-joystick';

import type { EnemyLayerHandle } from './enemy-layer';
import type { RunHudHandle } from './run-hud';
import type { RunFrame, RunFrameResult } from './use-run-loop';

const RESIZE_SETTLE_MS = 200;
const PLAYER_HURTBOX_HALF_FACTOR = 0.4;
const INITIAL_BOUNDS: Bounds = { left: 0, top: 0, width: 0, height: 0 };
const INITIAL_VIEWPORT: ViewportRect = { left: 0, top: 0, width: 0, height: 0 };
const INITIAL_ARENA_OFFSET: ArenaOffset = { left: 0, top: 0 };

interface ArenaOffset {
  readonly left: number;
  readonly top: number;
}

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
  const enemyLayerRef = useRef<HTMLDivElement>(null);
  const enemyLayerHandleRef = useRef<EnemyLayerHandle | null>(null);
  const hudRef = useRef<RunHudHandle | null>(null);
  const playerStateRef = useRef<PlayerState | null>(null);
  const boundsRef = useRef<Bounds>(INITIAL_BOUNDS);
  const viewportRef = useRef<ViewportRect>(INITIAL_VIEWPORT);
  const arenaOffsetRef = useRef<ArenaOffset>(INITIAL_ARENA_OFFSET);
  const [started, setStarted] = useState<boolean>(() => !isTouchDevice());
  const [starting, setStarting] = useState(false);
  const [initial] = useState(() => {
    const seed = createRunSeed();

    return { seed, world: createEnemyWorld(seed) };
  });
  const [storage] = useState(() => createProgressionStorage(getBrowserStorage()));
  const worldRef = useRef<EnemyWorld>(initial.world);

  const keyboardInputRef = useKeyboardInput(started);
  const {
    state: joystickState,
    activeRef: joystickStateRef,
    vectorRef: joystickInputRef,
    knobRef: joystickKnobRef,
    pointerHandlers,
  } = useTouchJoystick(started);

  const measureViewport = useCallback(() => {
    const arena = arenaRef.current;
    const layer = enemyLayerRef.current;

    if (arena === null || layer === null) {
      return;
    }

    const arenaRect = arena.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const bounds: Bounds = {
      left: 0,
      top: 0,
      width: Math.min(arenaRect.width, PLAYER_CONTAINER_SIZE),
      height: Math.min(arenaRect.height, PLAYER_CONTAINER_SIZE),
    };
    const currentPlayer = playerStateRef.current;
    const nextPlayer =
      currentPlayer === null
        ? createPlayer(PLAYER_BASE_STATS, bounds)
        : clampPlayerToBounds(currentPlayer, bounds);

    boundsRef.current = bounds;
    playerStateRef.current = nextPlayer;
    viewportRef.current = {
      left: 0,
      top: 0,
      width: layerRect.width,
      height: layerRect.height,
    };
    arenaOffsetRef.current = {
      left: arenaRect.left - layerRect.left,
      top: arenaRect.top - layerRect.top,
    };
    hudRef.current?.setArenaTop(arenaOffsetRef.current.top);
    writePlayerTransform(playerRef.current, nextPlayer);
  }, []);

  useLayoutEffect(() => {
    measureViewport();
  }, [measureViewport]);

  useEffect(() => {
    if (started) {
      hudRef.current?.setArenaTop(arenaOffsetRef.current.top);
    }
  }, [started]);

  useEffect(() => {
    let settleTimer: number | null = null;

    const scheduleMeasure = () => {
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }

      settleTimer = window.setTimeout(() => {
        settleTimer = null;
        measureViewport();
      }, RESIZE_SETTLE_MS);
    };

    window.addEventListener('resize', scheduleMeasure);

    let observer: ResizeObserver | null = null;
    const layer = enemyLayerRef.current;

    if (typeof ResizeObserver !== 'undefined' && layer !== null) {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(layer);
    }

    return () => {
      window.removeEventListener('resize', scheduleMeasure);

      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }

      observer?.disconnect();
    };
  }, [measureViewport]);

  const handleFrame = useCallback(
    (frame: RunFrame): RunFrameResult => {
      const currentPlayer = playerStateRef.current;

      if (currentPlayer === null) {
        return { playerAlive: true, deathAtMs: null };
      }

      const input =
        joystickStateRef.current !== null ? joystickInputRef.current : keyboardInputRef.current;
      let player = stepPlayer(currentPlayer, input, frame.activeMs / 1_000, boundsRef.current);
      let world = worldRef.current;
      let worldChanged = false;
      let deathAtMs: number | null = null;

      for (const stepEndMs of frame.fixedStepEndsMs) {
        if (!player.alive) {
          break;
        }

        const arenaOffset = arenaOffsetRef.current;
        const result = stepEnemies(world, {
          stepEndMs,
          viewport: viewportRef.current,
          playerHurtbox: {
            x: arenaOffset.left + player.x,
            y: arenaOffset.top + player.y,
            halfWidth: player.size * PLAYER_HURTBOX_HALF_FACTOR,
            halfHeight: player.size * PLAYER_HURTBOX_HALF_FACTOR,
          },
          playerAlive: player.alive,
        });

        world = result.world;
        worldChanged = true;

        if (result.hit !== null) {
          player = applyDamage(player, 1);

          if (!player.alive) {
            deathAtMs = stepEndMs;
            break;
          }
        }
      }

      playerStateRef.current = player;
      worldRef.current = world;
      writePlayerTransform(playerRef.current, player);

      if (worldChanged) {
        enemyLayerHandleRef.current?.write(world);
      }

      hudRef.current?.write(frame.run);

      return deathAtMs === null
        ? { playerAlive: true, deathAtMs: null }
        : { playerAlive: false, deathAtMs };
    },
    [joystickInputRef, joystickStateRef, keyboardInputRef],
  );

  const handleReset = useCallback((seed: number) => {
    const nextWorld = createEnemyWorld(seed);
    const nextPlayer = createPlayer(PLAYER_BASE_STATS, boundsRef.current);

    worldRef.current = nextWorld;
    playerStateRef.current = nextPlayer;
    writePlayerTransform(playerRef.current, nextPlayer);
    enemyLayerHandleRef.current?.write(nextWorld);
    hudRef.current?.write(createRun(seed));
  }, []);

  const runLoop = useRunLoop({
    running: started,
    initialSeed: initial.seed,
    createSeed: createRunSeed,
    storage,
    onFrame: handleFrame,
    onReset: handleReset,
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

      <EnemyLayer ref={enemyLayerHandleRef} layerRef={enemyLayerRef} />

      <TouchJoystick state={joystickState} knobRef={joystickKnobRef} />
      {started ? <RunHud ref={hudRef} banner={runLoop.snapshot.banner} /> : null}
      {started ? null : <StartOverlay onStart={handleStart} pending={starting} />}
    </section>
  );
}

function writePlayerTransform(element: HTMLDivElement | null, player: PlayerState): void {
  if (element === null) {
    return;
  }

  const x = player.x - player.size / 2;
  const y = player.y - player.size / 2;

  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
