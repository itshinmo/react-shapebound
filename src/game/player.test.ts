import { describe, expect, it } from 'vitest';

import {
  PLAYER_BASE_STATS,
  PLAYER_CONTAINER_SIZE,
  applyDamage,
  clampPlayerToBounds,
  createPlayer,
  stepPlayer,
} from './player';

const BOUNDS = { left: 0, top: 0, width: 800, height: 600 };

function createTestPlayer(maxHealth = 1) {
  return createPlayer({ ...PLAYER_BASE_STATS, maxHealth }, BOUNDS);
}

describe('player configuration', () => {
  it('starts with a container larger than the player', () => {
    expect(PLAYER_CONTAINER_SIZE).toBeGreaterThan(PLAYER_BASE_STATS.size);
  });
});

describe('createPlayer', () => {
  it('spawns centered with 1 health and no shield at base stats', () => {
    const player = createTestPlayer();

    expect(player.x).toBe(400);
    expect(player.y).toBe(300);
    expect(player.size).toBe(64);
    expect(player.speed).toBe(180);
    expect(player.health).toBe(1);
    expect(player.shield).toBe(0);
    expect(player.alive).toBe(true);
  });

  it('converts health above 1 into shield', () => {
    const player = createTestPlayer(3);

    expect(player.health).toBe(1);
    expect(player.shield).toBe(2);
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
  it('consumes shield before health', () => {
    const player = createTestPlayer(3);
    const next = applyDamage(player, 1);

    expect(next.health).toBe(1);
    expect(next.shield).toBe(1);
    expect(next.alive).toBe(true);
  });

  it('breaks the single health point when damage exceeds the shield', () => {
    const player = createTestPlayer(3);
    const next = applyDamage(player, 3);

    expect(next.health).toBe(0);
    expect(next.shield).toBe(0);
    expect(next.alive).toBe(false);
  });

  it('does not reduce health or shield for non-positive or non-finite damage', () => {
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
