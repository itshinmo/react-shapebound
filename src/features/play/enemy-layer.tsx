import { createRef, forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';

import type { BeamLane } from '@/game/enemy-collision';
import { getBeamLanes, getWarningLanes } from '@/game/enemy-world';
import type { EnemyKind, EnemySlot, EnemyWorld } from '@/game/enemy-world';

import type { RefObject } from 'react';

const BODY_SLOT_COUNT = 24;
const WARNING_SLOT_COUNT = 2;
const BEAM_SLOT_COUNT = 2;

const BODY_BASE_CLASS =
  'pointer-events-none absolute top-0 left-0 opacity-0 outline-1 -outline-offset-1 outline-ink/25 will-change-transform';
const RED_SQUARE_CLASS = `${BODY_BASE_CLASS} bg-red text-red glow-enemy`;
const TRIANGLE_CLASS = `${BODY_BASE_CLASS} bg-orange text-orange glow-enemy [clip-path:polygon(100%_50%,0_0,0_100%)]`;
const WARNING_CLASS =
  'pointer-events-none absolute top-0 left-0 origin-top-left border border-orange bg-orange/15 bg-warning-lane text-orange opacity-0 glow-warning will-change-transform';
const BEAM_CLASS =
  'pointer-events-none absolute top-0 left-0 origin-top-left border border-ink/40 bg-orange text-orange opacity-0 glow-warning will-change-transform';

export interface EnemyLayerHandle {
  write(world: EnemyWorld): void;
  clear(): void;
}

interface EnemyLayerProps {
  readonly layerRef?: RefObject<HTMLDivElement | null>;
}

export const EnemyLayer = forwardRef<EnemyLayerHandle, EnemyLayerProps>(function EnemyLayer(
  { layerRef },
  ref,
) {
  const [nodes] = useState(() => ({
    bodies: Array.from({ length: BODY_SLOT_COUNT }, () => createRef<HTMLDivElement>()),
    warnings: Array.from({ length: WARNING_SLOT_COUNT }, () => createRef<HTMLDivElement>()),
    beams: Array.from({ length: BEAM_SLOT_COUNT }, () => createRef<HTMLDivElement>()),
  }));
  const playedKindsRef = useRef<(EnemyKind | null)[]>(
    Array.from({ length: BODY_SLOT_COUNT }, () => null),
  );

  const write = useCallback(
    (world: EnemyWorld) => {
      const playedKinds = playedKindsRef.current;

      for (let index = 0; index < BODY_SLOT_COUNT; index += 1) {
        writeBody(
          nodes.bodies[index]?.current ?? null,
          world.slots[index] ?? null,
          playedKinds,
          index,
        );
      }

      writeLanes(nodes.warnings, getWarningLanes(world));
      writeLanes(nodes.beams, getBeamLanes(world));
    },
    [nodes],
  );

  const clear = useCallback(() => {
    const playedKinds = playedKindsRef.current;

    for (let index = 0; index < BODY_SLOT_COUNT; index += 1) {
      const node = nodes.bodies[index]?.current ?? null;

      if (node === null) {
        continue;
      }

      setBodyKind(node, null);
      node.style.transform = '';
      node.style.opacity = '0';
      playedKinds[index] = null;
    }

    hideLanes(nodes.warnings);
    hideLanes(nodes.beams);
  }, [nodes]);

  useImperativeHandle(ref, () => ({ write, clear }), [write, clear]);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      data-enemy-layer=""
      data-testid="enemy-layer"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {nodes.bodies.map((bodyRef, index) => (
        <div
          key={index}
          ref={bodyRef}
          data-enemy-body=""
          data-testid="enemy-body"
          className={BODY_BASE_CLASS}
        />
      ))}
      {nodes.warnings.map((warningRef, index) => (
        <div
          key={index}
          ref={warningRef}
          data-enemy-warning=""
          data-testid="enemy-warning"
          className={WARNING_CLASS}
        />
      ))}
      {nodes.beams.map((beamRef, index) => (
        <div
          key={index}
          ref={beamRef}
          data-enemy-beam=""
          data-testid="enemy-beam"
          className={BEAM_CLASS}
        />
      ))}
    </div>
  );
});

function writeBody(
  node: HTMLDivElement | null,
  slot: EnemySlot | null,
  playedKinds: (EnemyKind | null)[],
  index: number,
): void {
  if (node === null) {
    return;
  }

  const kind = slot?.kind ?? null;
  const previousKind = playedKinds[index] ?? null;

  if (kind !== previousKind) {
    setBodyKind(node, kind);
    playedKinds[index] = kind;
  }

  if (slot === null) {
    node.style.transform = '';
    node.style.opacity = '0';
    return;
  }

  node.style.transform = bodyTransform(slot);
  node.style.opacity = '1';
}

function setBodyKind(node: HTMLDivElement, kind: EnemyKind | null): void {
  switch (kind) {
    case null:
      node.className = BODY_BASE_CLASS;
      node.style.width = '';
      node.style.height = '';
      return;
    case 'red-square':
      node.className = RED_SQUARE_CLASS;
      node.style.width = `${slotSize(kind)}px`;
      node.style.height = `${slotSize(kind)}px`;
      return;
    case 'orange-triangle':
      node.className = TRIANGLE_CLASS;
      node.style.width = `${slotSize(kind)}px`;
      node.style.height = `${slotSize(kind)}px`;
      return;
  }
}

function slotSize(kind: EnemyKind): number {
  return kind === 'red-square' ? 32 : 40;
}

function bodyTransform(slot: EnemySlot): string {
  const half = slot.sizePx / 2;
  const translation = `translate3d(${slot.x - half}px, ${slot.y - half}px, 0)`;

  if (slot.kind === 'red-square') {
    return translation;
  }

  return `${translation} rotate(${Math.atan2(slot.aimY, slot.aimX)}rad)`;
}

function writeLanes(
  laneRefs: readonly RefObject<HTMLDivElement | null>[],
  lanes: readonly BeamLane[],
): void {
  for (let index = 0; index < laneRefs.length; index += 1) {
    const node = laneRefs[index]?.current ?? null;

    if (node === null) {
      continue;
    }

    const lane = lanes[index];

    if (lane === undefined) {
      node.style.opacity = '0';
      continue;
    }

    node.style.width = `${lane.lengthPx}px`;
    node.style.height = `${lane.widthPx}px`;
    node.style.transform = laneTransform(lane);
    node.style.opacity = '1';
  }
}

function hideLanes(laneRefs: readonly RefObject<HTMLDivElement | null>[]): void {
  for (const laneRef of laneRefs) {
    const node = laneRef.current;

    if (node !== null) {
      node.style.opacity = '0';
    }
  }
}

function laneTransform(lane: BeamLane): string {
  const angle = Math.atan2(lane.dirY, lane.dirX);

  return `translate3d(${lane.originX}px, ${lane.originY}px, 0) rotate(${angle}rad) translateY(-50%)`;
}
