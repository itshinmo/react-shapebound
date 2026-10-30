import { describe, expect, it } from 'vitest';

import {
  PLAYER_BASE_STATS,
  PLAYER_CONTAINER_SIZE,
  addBarrier,
  applyDamage,
  clampPlayerToBounds,
  createPlayer,
  stepPlayer,
} from './player';

const BOUNDS = { left: 0, top: 0, width: 800, height: 600 };

function createTestPlayer(maxBarrier = 0) {
  return createPlayer({ ...PLAYER_BASE_STATS, maxBarrier }, BOUNDS);
}

describe('player configuration', () => {
  it('starts with a container larger than the player', () => {
    expect(PLAYER_CONTAINER_SIZE).toBeGreaterThan(PLAYER_BASE_STATS.size);
  });
});

describe('createPlayer', () => {
  it('spawns centered with 1 health and no barrier at base stats', () => {
    const player = createTestPlayer();

    expect(player.x).toBe(400);
    expect(player.y).toBe(300);
    expect(player.size).toBe(64);
    expect(player.speed).toBe(180);
    expect(player.health).toBe(1);
    expect(player.barrier).toBe(0);
    expect(player.maxBarrier).toBe(0);
    expect(player.alive).toBe(true);
  });

  it.each([0, 1, 2, 3] as const)('starts at full barrier with maxBarrier %i', (maxBarrier) => {
    const player = createTestPlayer(maxBarrier);

    expect(player.health).toBe(1);
    expect(player.maxBarrier).toBe(maxBarrier);
    expect(player.barrier).toBe(maxBarrier);
    expect(player.alive).toBe(true);
  });

  it('clamps maxBarrier defensively to an integer in 0..3', () => {
    expect(createTestPlayer(9).maxBarrier).toBe(3);
    expect(createTestPlayer(-2).maxBarrier).toBe(0);
    expect(createTestPlayer(2.9).maxBarrier).toBe(2);
    expect(createTestPlayer(Number.NaN).maxBarrier).toBe(0);
    expect(createTestPlayer(Number.POSITIVE_INFINITY).maxBarrier).toBe(0);
  });

  it('centers a player that is larger than the bounds', () => {
    const player = createPlayer(PLAYER_BASE_STATS, { left: 0, top: 0, width: 40, height: 30 });

    expect(player.x).toBe(20);
    expect(player.y).toBe(15);
  });

  it('centers inside bounds with a non-zero origin', () => {
    const player = createPlayer(PLAYER_BASE_STATS, { left: 40, top: 20, width: 200, height: 100 });

    expect(player.x).toBe(140);
    expect(player.y).toBe(70);
  });
});

describe('stepPlayer', () => {
  it('moves at the configured speed in a cardinal direction', () => {
    const player = createTestPlayer();
    const next = stepPlayer(player, { x: 1, y: 0 }, 1, BOUNDS);

    expect(next.x).toBe(580);
    expect(next.y).toBe(300);
  });

  it('scales analog input proportionally', () => {
    const player = createTestPlayer();
    const next = stepPlayer(player, { x: 0.5, y: 0 }, 1, BOUNDS);

    expect(next.x).toBe(490);
  });

  it('does not make diagonal movement faster', () => {
    const player = createTestPlayer();
    const next = stepPlayer(player, { x: 1, y: 1 }, 1, BOUNDS);
    const distance = Math.hypot(next.x - player.x, next.y - player.y);

    expect(distance).toBeCloseTo(180);
  });

  it('clamps the square to the bounds', () => {
    const player = createTestPlayer();
    const next = stepPlayer(player, { x: 1, y: 1 }, 10, BOUNDS);

    expect(next.x).toBe(768);
    expect(next.y).toBe(568);
  });

  it('returns the same state for zero, negative, or non-finite time', () => {
    const player = createTestPlayer();

    expect(stepPlayer(player, { x: 1, y: 0 }, 0, BOUNDS)).toBe(player);
    expect(stepPlayer(player, { x: 1, y: 0 }, -1, BOUNDS)).toBe(player);
    expect(stepPlayer(player, { x: 1, y: 0 }, Number.NaN, BOUNDS)).toBe(player);
    expect(stepPlayer(player, { x: 1, y: 0 }, Number.POSITIVE_INFINITY, BOUNDS)).toBe(player);
  });

  it('treats non-finite input as zero', () => {
    const player = createTestPlayer();

    expect(stepPlayer(player, { x: Number.NaN, y: Number.POSITIVE_INFINITY }, 1, BOUNDS)).toBe(
      player,
    );
  });

  it('does not move a dead player', () => {
    const dead = applyDamage(createTestPlayer(), 1);
    const next = stepPlayer(dead, { x: 1, y: 0 }, 1, BOUNDS);

    expect(next).toBe(dead);
  });

  it('does not regenerate barrier by moving or waiting', () => {
    const player = applyDamage(createTestPlayer(2), 1);
    const next = stepPlayer(player, { x: 1, y: 1 }, 10, BOUNDS);

    expect(next.barrier).toBe(1);
    expect(next.maxBarrier).toBe(2);
  });
});

describe('clampPlayerToBounds', () => {
  it('clamps to the edge when the bounds can still contain the square', () => {
    const player = createTestPlayer();
    const next = clampPlayerToBounds(player, { left: 0, top: 0, width: 100, height: 100 });

    expect(next.x).toBe(68);
    expect(next.y).toBe(68);
  });

  it('clamps to a bounds with a non-zero origin', () => {
    const player = createTestPlayer();
    const next = clampPlayerToBounds(player, { left: 40, top: 20, width: 200, height: 100 });

    expect(next.x).toBe(208);
    expect(next.y).toBe(88);
  });

  it('recenters a player when the bounds are smaller than the square', () => {
    const player = createTestPlayer();
    const next = clampPlayerToBounds(player, { left: 0, top: 0, width: 40, height: 30 });

    expect(next.x).toBe(20);
    expect(next.y).toBe(15);
  });

  it('returns the same state when the player is already inside', () => {
    const player = createTestPlayer();

    expect(clampPlayerToBounds(player, BOUNDS)).toBe(player);
  });
});

describe('applyDamage', () => {
  it('consumes barrier before health', () => {
    const player = createTestPlayer(3);
    const next = applyDamage(player, 1);

    expect(next.health).toBe(1);
    expect(next.barrier).toBe(2);
    expect(next.maxBarrier).toBe(3);
    expect(next.alive).toBe(true);
  });

  it('breaks the single health point when damage exceeds the barrier', () => {
    const player = createTestPlayer(3);
    const next = applyDamage(player, 4);

    expect(next.health).toBe(0);
    expect(next.barrier).toBe(0);
    expect(next.maxBarrier).toBe(3);
    expect(next.alive).toBe(false);
  });

  it('kills immediately at zero barrier', () => {
    const next = applyDamage(createTestPlayer(0), 1);

    expect(next.health).toBe(0);
    expect(next.barrier).toBe(0);
    expect(next.alive).toBe(false);
  });

  it('leaves no partial barrier on overkill', () => {
    const next = applyDamage(createTestPlayer(1), 2);

    expect(next.health).toBe(0);
    expect(next.barrier).toBe(0);
    expect(next.alive).toBe(false);
  });

  it('does not reduce health or barrier for non-positive or non-finite damage', () => {
    const player = createTestPlayer(3);

    expect(applyDamage(player, 0)).toBe(player);
    expect(applyDamage(player, -1)).toBe(player);
    expect(applyDamage(player, Number.NaN)).toBe(player);
    expect(applyDamage(player, Number.POSITIVE_INFINITY)).toBe(player);
    expect(applyDamage(player, 0.9)).toBe(player);
  });

  it('keeps a dead player unchanged', () => {
    const dead = applyDamage(createTestPlayer(), 1);

    expect(applyDamage(dead, 1)).toBe(dead);
  });
});

describe('addBarrier', () => {
  it('adds one charge below the cap', () => {
    const player = applyDamage(createTestPlayer(2), 1);
    const next = addBarrier(player, 1);

    expect(player.barrier).toBe(1);
    expect(next.barrier).toBe(2);
    expect(next.maxBarrier).toBe(2);
  });

  it('clamps at maxBarrier', () => {
    const player = createTestPlayer(2);

    expect(addBarrier(player, 1)).toBe(player);
    expect(addBarrier(applyDamage(player, 1), 5).barrier).toBe(2);
  });

  it('stays at zero when maxBarrier is zero', () => {
    const player = createTestPlayer(0);

    expect(addBarrier(player, 1).barrier).toBe(0);
  });

  it('does not add to a dead player', () => {
    const dead = applyDamage(createTestPlayer(1), 2);

    expect(addBarrier(dead, 1)).toBe(dead);
  });

  it('ignores non-positive, fractional, and non-finite amounts', () => {
    const player = applyDamage(createTestPlayer(2), 1);

    expect(addBarrier(player, 0)).toBe(player);
    expect(addBarrier(player, -1)).toBe(player);
    expect(addBarrier(player, 0.9)).toBe(player);
    expect(addBarrier(player, Number.NaN)).toBe(player);
    expect(addBarrier(player, Number.POSITIVE_INFINITY)).toBe(player);
  });
});
