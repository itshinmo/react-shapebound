import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { EnemyDefeated, ReflectedBeam, ReflectionPreview } from '@/game/combat';

import { CombatLayer, type CombatLayerHandle } from './combat-layer';

function beam(overrides: Partial<ReflectedBeam> = {}): ReflectedBeam {
  return {
    id: 3,
    originX: 100,
    originY: 200,
    dirX: 1,
    dirY: 0,
    lengthPx: 240,
    spawnedAtMs: 0,
    expiresAtMs: 180,
    ...overrides,
  };
}

function preview(overrides: Partial<ReflectionPreview> = {}): ReflectionPreview {
  return {
    slotId: 1,
    originX: 260,
    originY: 140,
    dirX: 0,
    dirY: 1,
    lengthPx: 180,
    ...overrides,
  };
}

function defeat(overrides: Partial<EnemyDefeated> = {}): EnemyDefeated {
  return {
    slotId: 0,
    kind: 'red-square',
    x: 100,
    y: 100,
    sizePx: 32,
    rotationRad: 0,
    atMs: 0,
    dropRoll: 1,
    dropSucceeded: false,
    barrierGranted: 0,
    ...overrides,
  };
}

function write(
  handleRef: { readonly current: CombatLayerHandle | null },
  overrides: {
    readonly beams?: readonly ReflectedBeam[];
    readonly previews?: readonly ReflectionPreview[];
    readonly defeats?: readonly EnemyDefeated[];
    readonly activeMs?: number;
    readonly explosionsEnabled?: boolean;
  } = {},
): void {
  act(() => {
    handleRef.current?.write({
      beams: overrides.beams ?? [],
      previews: overrides.previews ?? [],
      defeats: overrides.defeats ?? [],
      activeMs: overrides.activeMs ?? 0,
      explosionsEnabled: overrides.explosionsEnabled ?? true,
    });
  });
}

function renderLayer() {
  const handleRef = createRef<CombatLayerHandle>();
  const shieldLineRef = createRef<HTMLDivElement>();

  render(<CombatLayer ref={handleRef} shieldLineRef={shieldLineRef} />);

  return { handleRef, shieldLineRef };
}

describe('CombatLayer', () => {
  it('renders the bounded pool and the shield line', () => {
    const { shieldLineRef } = renderLayer();
    const layer = screen.getByTestId('combat-layer');

    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.className).toContain('z-[25]');
    expect(layer.className).toContain('overflow-hidden');
    expect(screen.getByTestId('shield-line')).toBe(shieldLineRef.current);
    expect(screen.getByTestId('shield-line')).toHaveStyle({ width: '64px', height: '2px' });
    expect(screen.getAllByTestId('reflected-beam')).toHaveLength(6);
    expect(screen.getAllByTestId('reflection-preview')).toHaveLength(6);
    expect(screen.getAllByTestId('explosion')).toHaveLength(12);
  });

  it('writes instant beams and dim previews without allocating nodes', () => {
    const { handleRef } = renderLayer();

    write(handleRef, {
      beams: [beam()],
      previews: [preview()],
    });

    const beams = screen.getAllByTestId('reflected-beam');
    const previews = screen.getAllByTestId('reflection-preview');

    expect(beams[0]).toHaveStyle({ opacity: '1', width: '240px', height: '12px' });
    expect(beams[0]?.className).toContain('origin-top-left');
    expect(beams[0]?.style.transform).toContain('translate3d(100px, 200px, 0)');
    expect(beams[0]?.style.transform).toContain('rotate(0rad)');
    expect(beams[0]).toHaveAttribute('data-beam-id', '3');
    expect(beams[1]).toHaveStyle({ opacity: '0' });

    expect(previews[0]).toHaveStyle({ opacity: '0.4', width: '180px', height: '12px' });
    expect(previews[0]?.className).toContain('origin-top-left');
    expect(previews[0]?.style.transform).toContain('translate3d(260px, 140px, 0)');
    expect(previews[0]?.style.transform).toContain('rotate(1.5707963267948966rad)');
    expect(previews[0]).toHaveAttribute('data-slot-id', '1');
    expect(previews[1]).toHaveStyle({ opacity: '0' });

    write(handleRef);

    expect(beams[0]).toHaveStyle({ opacity: '0' });
    expect(previews[0]).toHaveStyle({ opacity: '0' });
  });

  it('writes all six simultaneous beams and previews', () => {
    const { handleRef } = renderLayer();
    const beams = [0, 1, 2, 3, 4, 5].map((id) =>
      beam({ id, originX: 100 + id * 20, originY: 200 }),
    );
    const previews = Array.from({ length: 6 }, (_, slotId) =>
      preview({ slotId, originX: 300 + slotId * 20 }),
    );

    write(handleRef, { beams, previews });

    const beamNodes = screen.getAllByTestId('reflected-beam');
    const previewNodes = screen.getAllByTestId('reflection-preview');

    expect(beamNodes.every((node) => node.style.opacity === '1')).toBe(true);
    expect(beamNodes.map((node) => node.getAttribute('data-beam-id'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
    expect(previewNodes.every((node) => node.style.opacity === '0.4')).toBe(true);
  });

  it('animates a square explosion by active run time', () => {
    const { handleRef } = renderLayer();

    write(handleRef, { defeats: [defeat()] });

    const explosions = screen.getAllByTestId('explosion');
    const explosion = explosions[0];
    const path = screen.getAllByTestId('explosion-path')[0];

    expect(explosion).toHaveAttribute('data-kind', 'red-square');
    expect(explosion).toHaveStyle({ opacity: '0.9', width: '32px', height: '32px' });
    expect(explosion?.style.transform).toContain('scale(1)');
    expect(explosion?.className).toContain('text-red');
    expect(path?.getAttribute('d')).toBe('M 0 0 H 100 V 100 H 0 Z');

    write(handleRef, { activeMs: 225 });

    expect(explosion).toHaveStyle({ opacity: '0.45' });
    expect(explosion?.style.transform).toContain('scale(1.25)');

    write(handleRef, { activeMs: 450 });

    expect(explosion).toHaveStyle({ opacity: '0' });
    expect(explosion).not.toHaveAttribute('data-kind');
  });

  it('draws an orange triangle explosion with its own size, aim rotation, and triangle path', () => {
    const { handleRef } = renderLayer();

    write(handleRef, {
      defeats: [
        defeat({
          kind: 'orange-triangle',
          sizePx: 40,
          rotationRad: Math.PI / 2,
          x: 200,
          y: 160,
        }),
      ],
    });

    const explosion = screen.getAllByTestId('explosion')[0];
    const path = screen.getAllByTestId('explosion-path')[0];

    expect(explosion).toHaveAttribute('data-kind', 'orange-triangle');
    expect(explosion?.className).toContain('text-orange');
    expect(explosion).toHaveStyle({ width: '40px', height: '40px' });
    expect(explosion?.style.transform).toContain('rotate(1.5707963267948966rad)');
    expect(explosion?.style.transform).toContain('scale(1)');
    expect(path?.getAttribute('d')).toBe('M 100 50 L 0 0 L 0 100 Z');
  });

  it('suppresses explosions under reduced motion', () => {
    const { handleRef } = renderLayer();

    write(handleRef, {
      defeats: [defeat({ kind: 'orange-triangle' })],
      explosionsEnabled: false,
    });

    const explosions = screen.getAllByTestId('explosion');

    expect(explosions.every((node) => node.style.opacity === '0')).toBe(true);
    expect(explosions.every((node) => !node.hasAttribute('data-kind'))).toBe(true);
  });

  it('reuses the oldest explosion when all twelve nodes are active', () => {
    const { handleRef } = renderLayer();
    const defeats = Array.from({ length: 13 }, (_, index) =>
      defeat({ slotId: index, kind: index === 12 ? 'orange-triangle' : 'red-square' }),
    );

    write(handleRef, { defeats });

    const explosions = screen.getAllByTestId('explosion');
    const orange = explosions.filter(
      (node) => node.getAttribute('data-kind') === 'orange-triangle',
    );

    expect(orange).toHaveLength(1);
    expect(explosions.filter((node) => node.style.opacity === '0.9')).toHaveLength(12);
  });

  it('hides previews and clears every pool node', () => {
    const { handleRef } = renderLayer();

    write(handleRef, {
      beams: [beam()],
      previews: [preview()],
      defeats: [defeat()],
    });

    act(() => {
      handleRef.current?.hidePreviews();
    });

    expect(
      screen.getAllByTestId('reflection-preview').every((node) => node.style.opacity === '0'),
    ).toBe(true);

    act(() => {
      handleRef.current?.clear();
    });

    expect(
      screen.getAllByTestId('reflected-beam').every((node) => node.style.opacity === '0'),
    ).toBe(true);
    expect(screen.getAllByTestId('explosion').every((node) => node.style.opacity === '0')).toBe(
      true,
    );
  });
});
