import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useSettings } from '@/features/settings/settings-context';
import { getSystemReducedMotion } from '@/features/settings/settings-storage';
import {
  PLAYER_HURTBOX_HALF_FACTOR,
  createCombatState,
  getReflectionPreviews,
  stepCombat,
} from '@/game/combat';
import type { CombatState, EnemyDefeated } from '@/game/combat';
import type { ViewportRect } from '@/game/enemy-spawn';
import { createEnemyWorld } from '@/game/enemy-world';
import type { EnemyWorld } from '@/game/enemy-world';
import { clampPlayerToBounds, createPlayer, stepPlayer } from '@/game/player';
import type { Bounds, PlayerStats, PlayerState } from '@/game/player';
import { createEmptyProgression, type ProgressionRead } from '@/game/progression';
import { SHIELD_LENGTH_PX, getRingProgress, getShieldSegment } from '@/game/reflect-shield';
import type { ShieldNormal, ShieldPoint, ShieldSegment } from '@/game/reflect-shield';
import { createRun } from '@/game/run';
import { deriveLoadout } from '@/game/upgrades';
import type { RunLoadout } from '@/game/upgrades';
import { getBrowserStorage } from '@/shared/lib/storage';

import { CombatLayer } from './combat-layer';
import { EnemyLayer } from './enemy-layer';
import { isTouchDevice } from './is-touch-device';
import { LandscapeGate } from './landscape-gate';
import { releaseLandscapeLock, requestLandscapeLock } from './orientation-lock';
import { PauseMenu } from './pause-menu';
import { PlayerContainer } from './player-container';
import { PlayerSquare } from './player-square';
import { createProgressionStorage } from './progression-storage';
import { RunHud } from './run-hud';
import { RunOverOverlay } from './run-over-overlay';
import { createRunSeed } from './run-seed';
import { SaveGate } from './save-gate';
import { StartOverlay } from './start-overlay';
import { TouchJoystick } from './touch-joystick';
import { useKeyboardInput } from './use-keyboard-input';
import { useMouseShield } from './use-mouse-shield';
import { useRunLoop } from './use-run-loop';
import { useTouchControls } from './use-touch-controls';

import type { CombatLayerHandle } from './combat-layer';
import type { EnemyLayerHandle } from './enemy-layer';
import type { ProgressionStorage } from './progression-storage';
import type { RunHudHandle } from './run-hud';
import type { SaveGateReason } from './save-gate';
import type { ShieldInputPhase, ShieldSource } from './shield-input';
import type { RunFrame, RunFrameResult } from './use-run-loop';

const RESIZE_SETTLE_MS = 200;
const BARRIER_HIT_CUE_MS = 120;
const MOUSE_AIM_MIN_PX = 1;
const INITIAL_BOUNDS: Bounds = { left: 0, top: 0, width: 0, height: 0 };
const INITIAL_VIEWPORT: ViewportRect = { left: 0, top: 0, width: 0, height: 0 };
const INITIAL_ARENA_OFFSET: ArenaOffset = { left: 0, top: 0 };

interface ArenaOffset {
  readonly left: number;
  readonly top: number;
}

interface PlaySurfaceProps {
  readonly portrait: boolean;
  readonly storage: ProgressionStorage;
  readonly initialLoadout: RunLoadout;
  readonly onBlocked: (reason: SaveGateReason) => void;
}

type RunStartState =
  | { readonly kind: 'ready'; readonly loadout: RunLoadout }
  | { readonly kind: 'blocked'; readonly reason: SaveGateReason };

export function PlayScreen() {
  return <LandscapeGate>{(portrait) => <PlayEntry portrait={portrait} />}</LandscapeGate>;
}

function PlayEntry({ portrait }: { readonly portrait: boolean }) {
  const [storage] = useState(() => createProgressionStorage(getBrowserStorage()));
  const [start, setStart] = useState<RunStartState>(() => resolveRunStart(storage.read()));
  const handleBlocked = useCallback((reason: SaveGateReason) => {
    setStart({ kind: 'blocked', reason });
  }, []);

  if (start.kind === 'blocked') {
    return <SaveGate reason={start.reason} portrait={portrait} />;
  }

  return (
    <PlaySurface
      portrait={portrait}
      storage={storage}
      initialLoadout={start.loadout}
      onBlocked={handleBlocked}
    />
  );
}

function PlaySurface({ portrait, storage, initialLoadout, onBlocked }: PlaySurfaceProps) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const enemyLayerRef = useRef<HTMLDivElement>(null);
  const enemyLayerHandleRef = useRef<EnemyLayerHandle | null>(null);
  const hudRef = useRef<RunHudHandle | null>(null);
  const playerStateRef = useRef<PlayerState | null>(null);
  const wasOverRef = useRef(false);
  const focusPauseAfterResumeRef = useRef(false);
  const focusPlayAfterRestartRef = useRef(false);
  const boundsRef = useRef<Bounds>(INITIAL_BOUNDS);
  const viewportRef = useRef<ViewportRect>(INITIAL_VIEWPORT);
  const arenaOffsetRef = useRef<ArenaOffset>(INITIAL_ARENA_OFFSET);
  const centerPlayerOnMeasureRef = useRef(false);
  const [started, setStarted] = useState<boolean>(() => !isTouchDevice());
  const [starting, setStarting] = useState(false);
  const [loadout, setLoadout] = useState(initialLoadout);
  const loadoutRef = useRef(initialLoadout);
  const [initial] = useState(() => {
    const seed = createRunSeed();

    return { seed, world: createEnemyWorld(seed) };
  });
  const worldRef = useRef<EnemyWorld>(initial.world);
  const combatStateRef = useRef<CombatState>(createCombatState(initialLoadout, initial.seed));
  const { settings } = useSettings();
  const shieldLineRef = useRef<HTMLDivElement>(null);
  const combatLayerRef = useRef<CombatLayerHandle | null>(null);
  const reflectedBeamLengthsRef = useRef<Map<number, number>>(new Map());
  const ringProgressRef = useRef<SVGCircleElement>(null);
  const sourceRef = useRef<ShieldSource>('none');
  const shieldPhaseRef = useRef<ShieldInputPhase>('idle');
  const shieldNormalRef = useRef<ShieldNormal>({ x: 0, y: -1 });
  const hitCueTimerRef = useRef<number | null>(null);
  const [shieldPhase, setShieldPhaseState] = useState<ShieldInputPhase>('idle');
  const [shieldCharges, setShieldCharges] = useState(initialLoadout.maxReflectCharges);
  const [barrier, setBarrier] = useState(initialLoadout.maxBarrier);
  const [barrierHitCue, setBarrierHitCue] = useState(false);
  const [layoutResetEpoch, setLayoutResetEpoch] = useState(0);

  const setShieldPhase = useCallback((phase: ShieldInputPhase) => {
    if (shieldPhaseRef.current === phase) {
      return;
    }

    shieldPhaseRef.current = phase;
    setShieldPhaseState(phase);
  }, []);

  const clearBarrierHitCue = useCallback(() => {
    if (hitCueTimerRef.current !== null) {
      window.clearTimeout(hitCueTimerRef.current);
      hitCueTimerRef.current = null;
    }

    setBarrierHitCue(false);
  }, []);

  const handleShieldRelease = useCallback(() => {
    setShieldPhase('idle');
    writeShieldLine(shieldLineRef.current, null);
    combatLayerRef.current?.hidePreviews();
  }, [setShieldPhase]);

  const handleShieldEngage = useCallback(() => {
    const current = combatStateRef.current.shield;

    setShieldPhase(current.maxCharges > 0 && current.charges > 0 ? 'armed' : 'spent');
  }, [setShieldPhase]);

  const handleReset = useCallback(
    (seed: number) => {
      const nextWorld = createEnemyWorld(seed);
      const nextPlayer = createPlayer(toPlayerStats(loadoutRef.current), boundsRef.current);
      const nextCombat = createCombatState(loadoutRef.current, seed);

      centerPlayerOnMeasureRef.current = true;
      setLayoutResetEpoch((value) => value + 1);
      worldRef.current = nextWorld;
      playerStateRef.current = nextPlayer;
      combatStateRef.current = nextCombat;
      shieldPhaseRef.current = 'idle';
      shieldNormalRef.current = { x: 0, y: -1 };
      sourceRef.current = 'none';
      reflectedBeamLengthsRef.current.clear();
      combatLayerRef.current?.clear();
      setShieldPhaseState('idle');
      setShieldCharges(nextCombat.shield.charges);
      setBarrier(nextPlayer.barrier);
      clearBarrierHitCue();
      writePlayerTransform(playerRef.current, nextPlayer);
      writeShieldLine(shieldLineRef.current, null);
      writeChargeRing(
        ringProgressRef.current,
        loadoutRef.current.playerSize,
        getRingProgress(nextCombat.shield),
      );
      enemyLayerHandleRef.current?.write(nextWorld);
      hudRef.current?.write(createRun(seed));
    },
    [clearBarrierHitCue],
  );

  const runLoop = useRunLoop({
    running: started,
    initialSeed: initial.seed,
    createSeed: createRunSeed,
    storage,
    onFrame: handleFrame,
    onReset: handleReset,
    portrait,
  });
  const isOver = runLoop.snapshot.status === 'over';
  const isPaused = runLoop.snapshot.freezeReasons.includes('pause');
  const isFrozen = runLoop.snapshot.freezeReasons.length > 0;
  const inputBlocked = isPaused || isFrozen || isOver || portrait;
  const { pause, resume, restart, retry } = runLoop;

  const keyboardInputRef = useKeyboardInput(started, inputBlocked);
  const mouseShield = useMouseShield(
    started,
    inputBlocked,
    sourceRef,
    handleShieldEngage,
    handleShieldRelease,
  );
  const touchControls = useTouchControls(
    started,
    inputBlocked,
    loadout.maxReflectCharges > 0 && shieldCharges > 0,
    sourceRef,
    handleShieldRelease,
  );
  const showShieldJoystick =
    loadout.maxReflectCharges > 0 &&
    shieldCharges > 0 &&
    shieldPhase === 'armed' &&
    touchControls.shield !== null;

  useEffect(() => {
    if (!inputBlocked) {
      return;
    }

    setShieldPhase('idle');
    writeShieldLine(shieldLineRef.current, null);
    combatLayerRef.current?.hidePreviews();
  }, [inputBlocked, setShieldPhase]);

  useEffect(() => {
    return () => {
      if (hitCueTimerRef.current !== null) {
        window.clearTimeout(hitCueTimerRef.current);
      }
    };
  }, []);

  const measureViewport = useCallback(() => {
    const arena = arenaRef.current;
    const layer = enemyLayerRef.current;

    if (arena === null || layer === null) {
      return;
    }

    const arenaRect = arena.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const configuredArenaSize = loadoutRef.current.arenaSize;
    const size = Math.max(0, Math.min(configuredArenaSize, arenaRect.width, arenaRect.height));
    const bounds: Bounds = { left: 0, top: 0, width: size, height: size };
    const currentPlayer = playerStateRef.current;
    const nextPlayer =
      currentPlayer === null || centerPlayerOnMeasureRef.current
        ? createPlayer(toPlayerStats(loadoutRef.current), bounds)
        : clampPlayerToBounds(currentPlayer, bounds);

    centerPlayerOnMeasureRef.current = false;
    boundsRef.current = bounds;
    playerStateRef.current = nextPlayer;
    viewportRef.current = {
      left: 0,
      top: 0,
      width: layerRect.width,
      height: layerRect.height,
    };
    arenaOffsetRef.current = {
      left: arenaRect.left - layerRect.left + (arenaRect.width - size) / 2,
      top: arenaRect.top - layerRect.top + (arenaRect.height - size) / 2,
    };
    hudRef.current?.setArenaTop(arenaOffsetRef.current.top);
    writePlayerTransform(playerRef.current, nextPlayer);
  }, []);

  useLayoutEffect(() => {
    measureViewport();
  }, [layoutResetEpoch, loadout.arenaSize, measureViewport]);

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

  useEffect(() => {
    const board = boardRef.current;

    return () => {
      void releaseLandscapeLock(board).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (isOver) {
      wasOverRef.current = true;
      return;
    }

    if (!wasOverRef.current) {
      return;
    }

    wasOverRef.current = false;
    boardRef.current?.focus({ preventScroll: true });
  }, [isOver]);

  useEffect(() => {
    if (!isOver) {
      return;
    }

    hudRef.current?.write(runLoop.runRef.current);
  }, [isOver, runLoop.runRef]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    if (focusPauseAfterResumeRef.current) {
      focusPauseAfterResumeRef.current = false;
      hudRef.current?.focusPauseButton();
    }

    if (focusPlayAfterRestartRef.current) {
      focusPlayAfterRestartRef.current = false;
      boardRef.current?.focus({ preventScroll: true });
    }
  }, [isPaused]);

  useEffect(() => {
    if (!started || isOver || isPaused || portrait) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat || event.defaultPrevented) {
        return;
      }

      event.preventDefault();
      pause();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOver, isPaused, pause, portrait, started]);

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

  const handleResume = useCallback(() => {
    focusPauseAfterResumeRef.current = true;
    resume();
  }, [resume]);

  const prepareNewRun = useCallback((): boolean => {
    const next = resolveRunStart(storage.read());

    if (next.kind === 'blocked') {
      onBlocked(next.reason);
      return false;
    }

    loadoutRef.current = next.loadout;
    setLoadout(next.loadout);
    return true;
  }, [onBlocked, storage]);

  const handleRestart = useCallback(() => {
    if (!prepareNewRun()) {
      return;
    }

    focusPlayAfterRestartRef.current = true;
    restart();
  }, [prepareNewRun, restart]);

  const handleRetry = useCallback(() => {
    if (!prepareNewRun()) {
      return;
    }

    retry();
  }, [prepareNewRun, retry]);

  const handleBackToTitle = useCallback(() => {
    void navigate('/');
  }, [navigate]);

  const showBarrierHitCue = useCallback(() => {
    if (settings.reducedMotion || getSystemReducedMotion()) {
      return;
    }

    clearBarrierHitCue();
    setBarrierHitCue(true);
    hitCueTimerRef.current = window.setTimeout(() => {
      hitCueTimerRef.current = null;
      setBarrierHitCue(false);
    }, BARRIER_HIT_CUE_MS);
  }, [clearBarrierHitCue, settings.reducedMotion]);

  function handleFrame(frame: RunFrame): RunFrameResult {
    const currentPlayer = playerStateRef.current;

    if (currentPlayer === null) {
      return { playerAlive: true, deathAtMs: null };
    }

    if (frame.run.status !== 'active' || frame.run.freezeReasons.length > 0) {
      setShieldPhase('idle');
      writeShieldLine(shieldLineRef.current, null);
      combatLayerRef.current?.hidePreviews();
      return { playerAlive: true, deathAtMs: null };
    }

    const movementActive = touchControls.movementPointerIdRef.current !== null;
    const input = movementActive
      ? touchControls.movementVectorRef.current
      : keyboardInputRef.current;
    let player = stepPlayer(currentPlayer, input, frame.activeMs / 1_000, boundsRef.current);
    let world = worldRef.current;
    let combatState = combatStateRef.current;
    let phase = shieldPhaseRef.current;
    let normal = shieldNormalRef.current;
    let deathAtMs: number | null = null;
    let hitAbsorbed = false;
    let worldChanged = false;
    const defeats: EnemyDefeated[] = [];
    const engagedAtFrameStart =
      (sourceRef.current === 'mouse' && mouseShield.engagedRef.current) ||
      (sourceRef.current === 'touch' && touchControls.shieldPointerIdRef.current !== null);

    if (engagedAtFrameStart) {
      const aim = resolveShieldAim(
        sourceRef.current,
        player,
        arenaOffsetRef.current,
        mouseShield.positionRef.current,
        touchControls.shieldAimRef.current,
      );

      if (aim !== null) {
        normal = aim;
      }
    }

    for (const stepEndMs of frame.fixedStepEndsMs) {
      if (!player.alive) {
        break;
      }

      const arenaOffset = arenaOffsetRef.current;
      const engaged =
        (sourceRef.current === 'mouse' && mouseShield.engagedRef.current) ||
        (sourceRef.current === 'touch' && touchControls.shieldPointerIdRef.current !== null);
      const aim = engaged
        ? resolveShieldAim(
            sourceRef.current,
            player,
            arenaOffset,
            mouseShield.positionRef.current,
            touchControls.shieldAimRef.current,
          )
        : null;
      const result = stepCombat({
        state: combatState,
        player,
        world,
        phase,
        normal,
        engaged,
        aim,
        runActive: true,
        stepEndMs,
        viewport: viewportRef.current,
        arenaOffset,
        pierce: loadoutRef.current.pierce,
      });

      combatState = result.state;
      player = result.player;
      world = result.world;
      phase = result.phase;
      normal = result.normal;
      worldChanged = true;

      if (result.hitAbsorbed) {
        hitAbsorbed = true;
      }

      defeats.push(...result.defeats);

      for (const reflection of result.reflections) {
        reflectedBeamLengthsRef.current.set(reflection.slotId, reflection.incomingLengthPx);
      }

      if (result.deathAtMs !== null) {
        deathAtMs = result.deathAtMs;
        break;
      }
    }

    if (!player.alive) {
      phase = 'idle';
      clearBarrierHitCue();
    } else if (hitAbsorbed) {
      showBarrierHitCue();
    }

    for (const slotId of [...reflectedBeamLengthsRef.current.keys()]) {
      const slot = world.slots[slotId];

      if (slot?.kind !== 'orange-triangle' || slot.phase !== 'firing') {
        reflectedBeamLengthsRef.current.delete(slotId);
      }
    }

    const previousCharges = combatStateRef.current.shield.charges;

    combatStateRef.current = combatState;
    shieldNormalRef.current = normal;

    if (combatState.shield.charges !== previousCharges) {
      setShieldCharges(combatState.shield.charges);
    }

    if (player.barrier !== currentPlayer.barrier) {
      setBarrier(player.barrier);
    }

    setShieldPhase(phase);

    const arenaOffset = arenaOffsetRef.current;
    const shieldActive =
      combatState.shield.maxCharges > 0 &&
      combatState.shield.charges > 0 &&
      phase === 'armed' &&
      player.alive;
    const segment = shieldActive
      ? getShieldSegment(getPlayerCenter(player, arenaOffset), player.size, normal)
      : null;
    const previews =
      segment === null
        ? []
        : getReflectionPreviews({
            world,
            shield: segment,
            playerHurtbox: {
              x: arenaOffset.left + player.x,
              y: arenaOffset.top + player.y,
              halfWidth: player.size * PLAYER_HURTBOX_HALF_FACTOR,
              halfHeight: player.size * PLAYER_HURTBOX_HALF_FACTOR,
            },
            pierce: loadoutRef.current.pierce,
            viewport: viewportRef.current,
          });

    playerStateRef.current = player;
    worldRef.current = world;
    writePlayerTransform(playerRef.current, player);
    writeShieldLine(shieldLineRef.current, segment);
    writeChargeRing(ringProgressRef.current, player.size, getRingProgress(combatState.shield));

    if (worldChanged) {
      enemyLayerHandleRef.current?.write(world, reflectedBeamLengthsRef.current);
    }

    combatLayerRef.current?.write({
      beams: combatState.beams,
      previews,
      defeats,
      activeMs: frame.run.elapsedMs,
      explosionsEnabled: !(settings.reducedMotion || getSystemReducedMotion()),
    });

    hudRef.current?.write(frame.run);

    return deathAtMs === null
      ? { playerAlive: true, deathAtMs: null }
      : { playerAlive: false, deathAtMs };
  }

  return (
    <>
      <section
        ref={boardRef}
        aria-label="Play field"
        aria-describedby="play-instructions"
        tabIndex={-1}
        inert={isOver || portrait}
        className="fixed inset-0 touch-none overflow-hidden overscroll-none bg-void select-none focus:outline-none"
        onPointerDown={(event) => {
          mouseShield.pointerHandlers.onPointerDown(event);
          touchControls.pointerHandlers.onPointerDown(event);
        }}
        onPointerMove={touchControls.pointerHandlers.onPointerMove}
        onPointerUp={touchControls.pointerHandlers.onPointerUp}
        onPointerCancel={touchControls.pointerHandlers.onPointerCancel}
        onLostPointerCapture={touchControls.pointerHandlers.onLostPointerCapture}
        onContextMenu={mouseShield.pointerHandlers.onContextMenu}
      >
        <h1 className="sr-only">Play field</h1>
        <p id="play-instructions" className="sr-only">
          Move with W A S D or the arrow keys. On a touch screen, drag with one finger to move; a
          second simultaneous finger aims the reflect shield when a charge is available and a second
          joystick appears. With a mouse, hold the right mouse button and aim with the pointer.
          There is no keyboard control for the shield. The shield is a short line orbiting the
          player. It reflects an orange beam only when the beam reaches the shield's outward face
          before it reaches you; charging warning paths that would reflect show dim cyan previews.
          Reflected beams are instant cyan lasers and can destroy normal enemies. Triangle body
          contact also damages you. The ring inside the player shows the current reflect charges and
          the progress of the next charge. Barrier notches on the top edge of the player show how
          many hits you can absorb; no notches means the next hit ends the run. The outlined square
          is the boundary; stay inside it.
          {loadout.maxReflectCharges === 0
            ? ' This run has no reflect charges; the shield cannot be used.'
            : ''}
          {loadout.maxBarrier === 0 ? ' This run has no barrier; the first hit ends the run.' : ''}
        </p>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid opacity-60"
        />

        <div className="[container-type:size] absolute inset-0 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
          <div className="relative h-full w-full">
            <PlayerContainer arenaRef={arenaRef} size={loadout.arenaSize}>
              <PlayerSquare
                playerRef={playerRef}
                size={loadout.playerSize}
                maxReflectCharges={loadout.maxReflectCharges}
                charges={shieldCharges}
                maxBarrier={loadout.maxBarrier}
                barrier={barrier}
                ringProgressRef={ringProgressRef}
                barrierHit={barrierHitCue}
              />
            </PlayerContainer>
          </div>
        </div>

        <EnemyLayer ref={enemyLayerHandleRef} layerRef={enemyLayerRef} />

        <TouchJoystick
          variant="movement"
          state={touchControls.movement}
          knobRef={touchControls.movementKnobRef}
        />
        {showShieldJoystick ? (
          <TouchJoystick
            variant="shield"
            state={touchControls.shield}
            knobRef={touchControls.shieldKnobRef}
          />
        ) : null}

        <CombatLayer ref={combatLayerRef} shieldLineRef={shieldLineRef} />

        {started ? (
          <RunHud
            ref={hudRef}
            banner={runLoop.snapshot.banner}
            isPaused={isPaused}
            showPause={!isOver}
            onPause={pause}
          />
        ) : null}
        {started ? null : <StartOverlay onStart={handleStart} pending={starting} />}
      </section>

      {isPaused && !isOver ? (
        <PauseMenu
          frozenElapsedMs={runLoop.runRef.current.elapsedMs}
          suspended={portrait}
          onResume={handleResume}
          onRestart={handleRestart}
          onBackToTitle={handleBackToTitle}
        />
      ) : null}

      {isOver ? (
        <RunOverOverlay
          finalElapsedMs={runLoop.runRef.current.elapsedMs}
          commit={runLoop.snapshot.commit}
          committedData={runLoop.committedData}
          onRetry={handleRetry}
          onRetryCommit={runLoop.retryCommit}
          suspended={portrait}
        />
      ) : null}
    </>
  );
}

function resolveRunStart(read: ProgressionRead): RunStartState {
  if (read.kind === 'unreadable' || read.kind === 'unavailable') {
    return { kind: 'blocked', reason: read.kind };
  }

  const data = read.kind === 'valid' ? read.data : createEmptyProgression();

  return { kind: 'ready', loadout: deriveLoadout(data.upgrades) };
}

function toPlayerStats(loadout: RunLoadout): PlayerStats {
  return {
    speed: loadout.speed,
    size: loadout.playerSize,
    maxBarrier: loadout.maxBarrier,
  };
}

function getPlayerCenter(player: PlayerState, arenaOffset: ArenaOffset): ShieldPoint {
  return {
    x: arenaOffset.left + player.x,
    y: arenaOffset.top + player.y,
  };
}

function writePlayerTransform(element: HTMLDivElement | null, player: PlayerState): void {
  if (element === null) {
    return;
  }

  const x = player.x - player.size / 2;
  const y = player.y - player.size / 2;

  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function resolveShieldAim(
  source: ShieldSource,
  player: PlayerState,
  arenaOffset: ArenaOffset,
  mousePosition: { readonly x: number; readonly y: number },
  touchAim: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } | null {
  if (source === 'mouse') {
    const dx = mousePosition.x - (arenaOffset.left + player.x);
    const dy = mousePosition.y - (arenaOffset.top + player.y);
    const distance = Math.hypot(dx, dy);

    if (!Number.isFinite(distance) || distance <= MOUSE_AIM_MIN_PX) {
      return null;
    }

    return { x: dx / distance, y: dy / distance };
  }

  if (source === 'touch') {
    const magnitude = Math.hypot(touchAim.x, touchAim.y);

    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      return null;
    }

    return { x: touchAim.x / magnitude, y: touchAim.y / magnitude };
  }

  return null;
}

function writeShieldLine(element: HTMLDivElement | null, segment: ShieldSegment | null): void {
  if (element === null) {
    return;
  }

  if (segment === null) {
    element.style.opacity = '0';
    return;
  }

  const angle = Math.atan2(segment.by - segment.ay, segment.bx - segment.ax);

  element.style.transform = `translate3d(${segment.midpointX - SHIELD_LENGTH_PX / 2}px, ${
    segment.midpointY - 1
  }px, 0) rotate(${angle}rad)`;
  element.style.opacity = '1';
}

function writeChargeRing(
  element: SVGCircleElement | null,
  playerSize: number,
  progress: number,
): void {
  if (element === null) {
    return;
  }

  const diameter = Math.max(0, playerSize - 8);
  const radius = Math.max(0, diameter / 2 - 1);
  const circumference = 2 * Math.PI * radius;

  element.setAttribute('stroke-dashoffset', `${circumference * (1 - progress)}`);
}
