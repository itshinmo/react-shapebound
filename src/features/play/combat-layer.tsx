import { createRef, forwardRef, useCallback, useImperativeHandle, useState } from 'react';

import {
  EXPLOSION_DURATION_MS,
  EXPLOSION_END_SIZE_PX,
  EXPLOSION_POOL_SIZE,
  REFLECTION_PREVIEW_POOL_SIZE,
  REFLECTED_BEAM_POOL_SIZE,
  REFLECTED_BEAM_WIDTH_PX,
  type EnemyDefeated,
  type ReflectedBeam,
  type ReflectionPreview,
} from '@/game/combat';
import { SHIELD_LENGTH_PX } from '@/game/reflect-shield';

import type { RefObject } from 'react';

const SHIELD_HEIGHT_PX = 2;
const PREVIEW_OPACITY = 0.4;
const BEAM_CLASS =
  'pointer-events-none absolute top-0 left-0 origin-top-left bg-cyan text-cyan opacity-0 glow-track will-change-transform';
const PREVIEW_CLASS =
  'pointer-events-none absolute top-0 left-0 origin-top-left bg-cyan/30 text-cyan opacity-0 glow-track will-change-transform';
const EXPLOSION_BASE_CLASS =
  'pointer-events-none absolute top-0 left-0 opacity-0 glow-enemy will-change-transform';
const EXPLOSION_RED_CLASS = `${EXPLOSION_BASE_CLASS} text-red`;
const EXPLOSION_ORANGE_CLASS = `${EXPLOSION_BASE_CLASS} text-orange`;
const SQUARE_PATH = 'M 0 0 H 100 V 100 H 0 Z';
const TRIANGLE_PATH = 'M 100 50 L 0 0 L 0 100 Z';

export interface CombatLayerFrame {
  readonly beams: readonly ReflectedBeam[];
  readonly previews: readonly ReflectionPreview[];
  readonly defeats: readonly EnemyDefeated[];
  readonly activeMs: number;
  readonly explosionsEnabled: boolean;
}

export interface CombatLayerHandle {
  write(frame: CombatLayerFrame): void;
  hidePreviews(): void;
  clear(): void;
}

interface CombatLayerProps {
  readonly shieldLineRef: RefObject<HTMLDivElement | null>;
}

interface ExplosionState {
  readonly kind: EnemyDefeated['kind'];
  readonly x: number;
  readonly y: number;
  readonly sizePx: number;
  readonly rotationRad: number;
  readonly startedAtMs: number;
}

export const CombatLayer = forwardRef<CombatLayerHandle, CombatLayerProps>(function CombatLayer(
  { shieldLineRef },
  ref,
) {
  const [nodes] = useState(() => ({
    beams: Array.from({ length: REFLECTED_BEAM_POOL_SIZE }, () => createRef<HTMLDivElement>()),
    previews: Array.from({ length: REFLECTION_PREVIEW_POOL_SIZE }, () =>
      createRef<HTMLDivElement>(),
    ),
    explosions: Array.from({ length: EXPLOSION_POOL_SIZE }, () => createRef<HTMLDivElement>()),
    explosionPaths: Array.from({ length: EXPLOSION_POOL_SIZE }, () => createRef<SVGPathElement>()),
  }));
  const [explosionStates] = useState<(ExplosionState | null)[]>(() =>
    Array.from({ length: EXPLOSION_POOL_SIZE }, () => null),
  );

  const hidePreviews = useCallback(() => {
    for (const previewRef of nodes.previews) {
      hideLine(previewRef.current);
    }
  }, [nodes.previews]);

  const write = useCallback(
    (frame: CombatLayerFrame) => {
      writeBeams(nodes.beams, frame.beams);
      writePreviews(nodes.previews, frame.previews);

      if (!frame.explosionsEnabled) {
        for (let index = 0; index < EXPLOSION_POOL_SIZE; index += 1) {
          explosionStates[index] = null;
          hideExplosion(nodes.explosions[index]?.current ?? null);
        }

        return;
      }

      for (const defeat of frame.defeats) {
        const freeIndex = explosionStates.findIndex((state) => state === null);
        const index = freeIndex !== -1 ? freeIndex : findOldestExplosionIndex(explosionStates);

        explosionStates[index] = {
          kind: defeat.kind,
          x: defeat.x,
          y: defeat.y,
          sizePx: defeat.sizePx,
          rotationRad: defeat.rotationRad,
          startedAtMs: defeat.atMs,
        };
      }

      for (let index = 0; index < EXPLOSION_POOL_SIZE; index += 1) {
        const node = nodes.explosions[index]?.current ?? null;
        const path = nodes.explosionPaths[index]?.current ?? null;
        const state = explosionStates[index] ?? null;

        if (node === null) {
          continue;
        }

        if (state === null) {
          hideExplosion(node);
          continue;
        }

        const progress = Math.min(
          1,
          Math.max(0, (frame.activeMs - state.startedAtMs) / EXPLOSION_DURATION_MS),
        );

        if (progress >= 1) {
          explosionStates[index] = null;
          hideExplosion(node);
          continue;
        }

        const isTriangle = state.kind === 'orange-triangle';
        const endScale = EXPLOSION_END_SIZE_PX / state.sizePx;

        node.className = isTriangle ? EXPLOSION_ORANGE_CLASS : EXPLOSION_RED_CLASS;
        node.setAttribute('data-kind', state.kind);
        node.style.width = `${state.sizePx}px`;
        node.style.height = `${state.sizePx}px`;
        node.style.opacity = `${0.9 * (1 - progress)}`;
        node.style.transform = `translate3d(${state.x - state.sizePx / 2}px, ${
          state.y - state.sizePx / 2
        }px, 0) rotate(${state.rotationRad}rad) scale(${1 + (endScale - 1) * progress})`;

        if (path !== null) {
          path.setAttribute('d', isTriangle ? TRIANGLE_PATH : SQUARE_PATH);
        }
      }
    },
    [explosionStates, nodes.beams, nodes.explosionPaths, nodes.explosions, nodes.previews],
  );

  const clear = useCallback(() => {
    for (const beamRef of nodes.beams) {
      hideLine(beamRef.current);
    }

    for (const previewRef of nodes.previews) {
      hideLine(previewRef.current);
    }

    for (let index = 0; index < EXPLOSION_POOL_SIZE; index += 1) {
      explosionStates[index] = null;
      hideExplosion(nodes.explosions[index]?.current ?? null);
    }
  }, [explosionStates, nodes.beams, nodes.explosions, nodes.previews]);

  useImperativeHandle(ref, () => ({ write, hidePreviews, clear }), [clear, hidePreviews, write]);

  return (
    <div
      aria-hidden="true"
      data-testid="combat-layer"
      className="pointer-events-none absolute inset-0 z-[25] overflow-hidden"
    >
      <div
        ref={shieldLineRef}
        data-testid="shield-line"
        className="pointer-events-none absolute top-0 left-0 bg-cyan text-cyan opacity-0 glow-track will-change-transform"
        style={{ width: SHIELD_LENGTH_PX, height: SHIELD_HEIGHT_PX, opacity: 0 }}
      />
      {nodes.previews.map((previewRef, index) => (
        <div
          key={`preview-${index}`}
          ref={previewRef}
          data-testid="reflection-preview"
          className={PREVIEW_CLASS}
          style={{ height: REFLECTED_BEAM_WIDTH_PX, opacity: 0 }}
        />
      ))}
      {nodes.beams.map((beamRef, index) => (
        <div
          key={`beam-${index}`}
          ref={beamRef}
          data-testid="reflected-beam"
          className={BEAM_CLASS}
          style={{ height: REFLECTED_BEAM_WIDTH_PX, opacity: 0 }}
        />
      ))}
      {nodes.explosions.map((explosionRef, index) => (
        <div
          key={`explosion-${index}`}
          ref={explosionRef}
          data-testid="explosion"
          className={EXPLOSION_BASE_CLASS}
          style={{ opacity: 0 }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="pointer-events-none size-full overflow-visible"
          >
            <path
              ref={nodes.explosionPaths[index]}
              data-testid="explosion-path"
              fill="none"
              stroke="currentColor"
              strokeWidth={5}
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ))}
    </div>
  );
});

function writeBeams(
  beamRefs: readonly RefObject<HTMLDivElement | null>[],
  beams: readonly ReflectedBeam[],
): void {
  for (let index = 0; index < beamRefs.length; index += 1) {
    const node = beamRefs[index]?.current ?? null;

    if (node === null) {
      continue;
    }

    const beam = beams[index];

    if (beam === undefined) {
      hideLine(node);
      continue;
    }

    node.style.width = `${beam.lengthPx}px`;
    node.style.transform = lineTransform(
      beam.originX,
      beam.originY,
      beam.dirX,
      beam.dirY,
      REFLECTED_BEAM_WIDTH_PX,
    );
    node.style.opacity = '1';
    node.setAttribute('data-beam-id', String(beam.id));
  }
}

function writePreviews(
  previewRefs: readonly RefObject<HTMLDivElement | null>[],
  previews: readonly ReflectionPreview[],
): void {
  for (let index = 0; index < previewRefs.length; index += 1) {
    const node = previewRefs[index]?.current ?? null;

    if (node === null) {
      continue;
    }

    const preview = previews[index];

    if (preview === undefined) {
      hideLine(node);
      continue;
    }

    node.style.width = `${preview.lengthPx}px`;
    node.style.transform = lineTransform(
      preview.originX,
      preview.originY,
      preview.dirX,
      preview.dirY,
      REFLECTED_BEAM_WIDTH_PX,
    );
    node.style.opacity = String(PREVIEW_OPACITY);
    node.setAttribute('data-slot-id', String(preview.slotId));
  }
}

function hideLine(node: HTMLDivElement | null): void {
  if (node === null) {
    return;
  }

  node.style.opacity = '0';
  node.style.transform = '';
  node.removeAttribute('data-beam-id');
  node.removeAttribute('data-slot-id');
}

function lineTransform(
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  height: number,
): string {
  const angle = Math.atan2(dirY, dirX);

  return `translate3d(${originX}px, ${originY}px, 0) rotate(${angle}rad) translateY(-${
    height / 2
  }px)`;
}

function findOldestExplosionIndex(states: readonly (ExplosionState | null)[]): number {
  let oldestIndex = 0;
  let oldestStart = Number.POSITIVE_INFINITY;

  for (let index = 0; index < states.length; index += 1) {
    const state = states[index];

    if (state === null || state === undefined) {
      return index;
    }

    if (state.startedAtMs < oldestStart) {
      oldestStart = state.startedAtMs;
      oldestIndex = index;
    }
  }

  return oldestIndex;
}

function hideExplosion(node: HTMLDivElement | null): void {
  if (node === null) {
    return;
  }

  node.className = EXPLOSION_BASE_CLASS;
  node.style.opacity = '0';
  node.style.transform = '';
  node.style.width = '';
  node.style.height = '';
  node.removeAttribute('data-kind');
}
