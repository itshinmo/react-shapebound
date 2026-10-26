import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { BeamLane } from '@/game/enemy-collision';
import type { TriangleSlot } from '@/game/enemy-orange-triangle';
import type { RedSquareSlot } from '@/game/enemy-red-square';
import { createEnemyWorld } from '@/game/enemy-world';
import type { EnemySlot, EnemyWorld } from '@/game/enemy-world';

import { EnemyLayer } from './enemy-layer';

import type { EnemyLayerHandle } from './enemy-layer';

const LANE: BeamLane = {
  originX: 260,
  originY: 140,
  dirX: Math.SQRT1_2,
  dirY: Math.SQRT1_2,
  widthPx: 57.6,
  lengthPx: 320,
};

function createWorld(slots: readonly (EnemySlot | null)[]): EnemyWorld {
  return {
    ...createEnemyWorld(1),
    slots: Array.from({ length: 24 }, (_, index) => slots[index] ?? null),
  };
}

function createRed(overrides: Partial<RedSquareSlot> = {}): RedSquareSlot {
  return {
    id: 0,
    kind: 'red-square',
    x: 100,
    y: 80,
    dirX: 1,
    dirY: 0,
    speedPxPerSec: 108.8,
    sizePx: 32,
    spawnSide: 'left',
    spawnedAtMs: 2_000,
    enteredViewport: true,
    damagedPlayer: false,
    ...overrides,
  };
}

function createTriangle(overrides: Partial<TriangleSlot> = {}): TriangleSlot {
  return {
    id: 1,
    kind: 'orange-triangle',
    phase: 'approach',
    x: 200,
    y: 120,
    stopX: 200,
    stopY: 120,
    aimX: 0,
    aimY: 1,
    approachSpeedPxPerSec: 95.4,
    exitSpeedPxPerSec: 119.25,
    spawnedAtMs: 45_000,
    arrivedAtMs: null,
    chargeEndsAtMs: null,
    beamEndsAtMs: null,
    lane: null,
    sizePx: 40,
    enteredViewport: true,
    ...overrides,
  };
}

function bodyNodes(): HTMLElement[] {
  return screen.getAllByTestId('enemy-body');
}

function warningNodes(): HTMLElement[] {
  return screen.getAllByTestId('enemy-warning');
}

function beamNodes(): HTMLElement[] {
  return screen.getAllByTestId('enemy-beam');
}

function nodeAt(nodes: readonly HTMLElement[], index: number): HTMLElement {
  const node = nodes[index];

  if (node === undefined) {
    throw new Error(`Expected enemy layer node at index ${index}.`);
  }

  return node;
}

function renderLayer() {
  const handleRef = createRef<EnemyLayerHandle>();

  render(<EnemyLayer ref={handleRef} />);

  return { handleRef };
}

describe('EnemyLayer', () => {
  it('preallocates 24 bodies, 2 warnings, and 2 beams in an aria-hidden layer', () => {
    renderLayer();

    const layer = screen.getByTestId('enemy-layer');
    const bodies = bodyNodes();
    const warnings = warningNodes();
    const beams = beamNodes();

    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.className).toContain('pointer-events-none');
    expect(layer.className).toContain('absolute');
    expect(layer.className).toContain('inset-0');
    expect(layer.className).toContain('z-20');
    expect(layer.className).toContain('overflow-hidden');
    expect(layer).not.toHaveAttribute('tabindex');
    expect(bodies).toHaveLength(24);
    expect(warnings).toHaveLength(2);
    expect(beams).toHaveLength(2);

    for (const body of bodies) {
      expect(body.className).toContain('opacity-0');
      expect(body).not.toHaveAttribute('tabindex');
    }

    for (const warning of warnings) {
      expect(warning.className).toContain('opacity-0');
      expect(warning).not.toHaveAttribute('tabindex');
    }

    for (const beam of beams) {
      expect(beam.className).toContain('opacity-0');
      expect(beam).not.toHaveAttribute('tabindex');
    }
  });

  it('writes red and triangle bodies, warning lanes, and beam lanes', () => {
    const { handleRef } = renderLayer();
    const world = createWorld([
      createRed(),
      createTriangle({ id: 1, phase: 'approach' }),
      createTriangle({ id: 2, phase: 'aimed', aimX: 1, aimY: 0, arrivedAtMs: 45_000, lane: LANE }),
      createTriangle({
        id: 3,
        phase: 'charging',
        aimX: LANE.dirX,
        aimY: LANE.dirY,
        arrivedAtMs: 45_000,
        chargeEndsAtMs: 46_555,
        lane: LANE,
      }),
      createTriangle({
        id: 4,
        phase: 'firing',
        aimX: LANE.dirX,
        aimY: LANE.dirY,
        arrivedAtMs: 45_000,
        beamEndsAtMs: 46_735,
        lane: LANE,
      }),
    ]);

    act(() => {
      handleRef.current?.write(world);
    });

    const redBody = nodeAt(bodyNodes(), 0);
    const approachBody = nodeAt(bodyNodes(), 1);
    const aimedBody = nodeAt(bodyNodes(), 2);
    const chargingBody = nodeAt(bodyNodes(), 3);
    const firingBody = nodeAt(bodyNodes(), 4);
    const warning = nodeAt(warningNodes(), 0);
    const unusedWarning = nodeAt(warningNodes(), 1);
    const beam = nodeAt(beamNodes(), 0);
    const unusedBeam = nodeAt(beamNodes(), 1);
    const laneRotation = Math.atan2(LANE.dirY, LANE.dirX);

    expect(redBody.style.opacity).toBe('1');
    expect(redBody.style.width).toBe('32px');
    expect(redBody.style.height).toBe('32px');
    expect(redBody.className).toContain('bg-red');
    expect(redBody.className).toContain('glow-enemy');
    expect(redBody.style.transform).toBe('translate3d(84px, 64px, 0)');
    expect(redBody.style.transform).not.toContain('rotate');

    expect(approachBody.style.opacity).toBe('1');
    expect(approachBody.style.width).toBe('40px');
    expect(approachBody.style.height).toBe('40px');
    expect(approachBody.className).toContain('bg-orange');
    expect(approachBody.className).toContain('glow-enemy');
    expect(approachBody.className).toContain('clip-path');
    expect(approachBody.style.transform).toBe(
      `translate3d(180px, 100px, 0) rotate(${Math.atan2(1, 0)}rad)`,
    );

    expect(aimedBody.style.opacity).toBe('1');
    expect(aimedBody.style.transform).toBe('translate3d(180px, 100px, 0) rotate(0rad)');

    expect(chargingBody.style.opacity).toBe('1');
    expect(chargingBody.style.transform).toBe(
      `translate3d(180px, 100px, 0) rotate(${laneRotation}rad)`,
    );

    expect(firingBody.style.opacity).toBe('1');
    expect(firingBody.style.transform).toBe(
      `translate3d(180px, 100px, 0) rotate(${laneRotation}rad)`,
    );

    expect(warning.style.opacity).toBe('1');
    expect(warning.style.width).toBe('320px');
    expect(warning.style.height).toBe('57.6px');
    expect(warning.style.transform).toBe(
      `translate3d(260px, 140px, 0) rotate(${laneRotation}rad) translateY(-50%)`,
    );
    expect(warning.className).toContain('bg-warning-lane');
    expect(warning.className).toContain('border-orange');
    expect(warning.className).toContain('text-orange');
    expect(warning.className).toContain('glow-warning');
    expect(unusedWarning.style.opacity).toBe('0');

    expect(beam.style.opacity).toBe('1');
    expect(beam.style.width).toBe(warning.style.width);
    expect(beam.style.height).toBe(warning.style.height);
    expect(beam.style.transform).toBe(warning.style.transform);
    expect(beam.className).toContain('bg-orange');
    expect(beam.className).not.toContain('bg-warning-lane');
    expect(beam.className).toContain('text-orange');
    expect(beam.className).toContain('glow-warning');
    expect(unusedBeam.style.opacity).toBe('0');
  });

  it('reuses the same nodes when a world changes and clears stale shape and rotation', () => {
    const { handleRef } = renderLayer();
    const firstWorld = createWorld([
      createTriangle({ id: 0, phase: 'approach' }),
      createTriangle({
        id: 1,
        phase: 'charging',
        arrivedAtMs: 45_000,
        chargeEndsAtMs: 46_555,
        lane: LANE,
      }),
      createTriangle({
        id: 2,
        phase: 'firing',
        arrivedAtMs: 45_000,
        beamEndsAtMs: 46_735,
        lane: LANE,
      }),
    ]);
    const secondWorld = createWorld([createRed({ id: 0 })]);

    act(() => {
      handleRef.current?.write(firstWorld);
    });

    const bodies = bodyNodes();
    const warnings = warningNodes();
    const beams = beamNodes();

    expect(nodeAt(bodies, 0).className).toContain('bg-orange');
    expect(nodeAt(warnings, 0).style.opacity).toBe('1');
    expect(nodeAt(beams, 0).style.opacity).toBe('1');

    act(() => {
      handleRef.current?.write(secondWorld);
    });

    expect(bodyNodes()).toHaveLength(24);
    expect(nodeAt(bodyNodes(), 0)).toBe(nodeAt(bodies, 0));
    expect(nodeAt(warningNodes(), 0)).toBe(nodeAt(warnings, 0));
    expect(nodeAt(beamNodes(), 0)).toBe(nodeAt(beams, 0));

    const reusedBody = nodeAt(bodyNodes(), 0);

    expect(reusedBody.style.opacity).toBe('1');
    expect(reusedBody.className).toContain('bg-red');
    expect(reusedBody.className).not.toContain('bg-orange');
    expect(reusedBody.className).not.toContain('clip-path');
    expect(reusedBody.style.width).toBe('32px');
    expect(reusedBody.style.height).toBe('32px');
    expect(reusedBody.style.transform).not.toContain('rotate');
    expect(nodeAt(bodyNodes(), 1).style.opacity).toBe('0');
    expect(nodeAt(warningNodes(), 0).style.opacity).toBe('0');
    expect(nodeAt(beamNodes(), 0).style.opacity).toBe('0');
  });

  it('clears every body, warning, and beam', () => {
    const { handleRef } = renderLayer();
    const world = createWorld([
      createRed(),
      createTriangle({
        id: 1,
        phase: 'charging',
        arrivedAtMs: 45_000,
        chargeEndsAtMs: 46_555,
        lane: LANE,
      }),
      createTriangle({
        id: 2,
        phase: 'firing',
        arrivedAtMs: 45_000,
        beamEndsAtMs: 46_735,
        lane: LANE,
      }),
    ]);

    act(() => {
      handleRef.current?.write(world);
    });

    act(() => {
      handleRef.current?.clear();
    });

    for (const body of bodyNodes()) {
      expect(body.style.opacity).toBe('0');
      expect(body.className).not.toContain('bg-red');
      expect(body.className).not.toContain('bg-orange');
    }

    for (const warning of warningNodes()) {
      expect(warning.style.opacity).toBe('0');
    }

    for (const beam of beamNodes()) {
      expect(beam.style.opacity).toBe('0');
    }
  });
});
