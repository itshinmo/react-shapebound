import { describe, expect, it } from 'vitest';

import {
  RED_SQUARE_SAFETY_LIFETIME_MS,
  RED_SQUARE_SIZE_PX,
  markRedEntered,
  redAimDirection,
  redSpeedAtMs,
  shouldRecycleRedSquare,
  spawnRedSquare,
  stepRedSquare,
} from './enemy-red-square';
import { createRng, type Rng } from './rng';

const VIEWPORT = { left: 0, top: 0, width: 800, height: 600 };
const PLAYER = { x: 400, y: 300 };

function createScriptedRng(values: readonly number[]): Rng {
  let index = 0;
  let state = 0;

  const read = (): number => {
    const value = values[index];

    if (value === undefined) {
      throw new Error('Scripted RNG exhausted.');
    }

    index += 1;
    state += 1;
    return value;
  };

  return {
    next: read,
    nextInt(maxExclusive: number): number {
      return Math.floor(read() * maxExclusive);
    },
    getState(): number {
      return state;
    },
  };
}

function spawnAt(overrides: {
  readonly rng?: Rng;
  readonly spawnedAtMs?: number;
  readonly lastSpawn?: {
    readonly side: 'top' | 'right' | 'bottom' | 'left';
    readonly alongPx: number;
    readonly atMs: number;
  } | null;
}) {
  return spawnRedSquare({
    id: 0,
    rng: overrides.rng ?? createScriptedRng([0, 0.5]),
    viewport: VIEWPORT,
    playerCenter: PLAYER,
    spawnedAtMs: overrides.spawnedAtMs ?? 2_000,
    lastSpawn: overrides.lastSpawn ?? null,
  });
}

describe('redSpeedAtMs', () => {
  it('matches the difficulty formula at 0, 300, 600, and 1000 seconds', () => {
    expect(redSpeedAtMs(0)).toBeCloseTo(108.8);
    expect(redSpeedAtMs(300_000)).toBeCloseTo(166.4);
    expect(redSpeedAtMs(600_000)).toBeCloseTo(224);
    expect(redSpeedAtMs(1_000_000)).toBeCloseTo(224);
  });

  it('grows continuously between sample points', () => {
    expect(redSpeedAtMs(1_000)).toBeCloseTo(108.992);
  });
});

describe('redAimDirection', () => {
  it('returns a unit direction toward the player center', () => {
    const aim = redAimDirection(0, 0, 3, 4, 'top');

    expect(aim.x).toBeCloseTo(0.6);
    expect(aim.y).toBeCloseTo(0.8);
  });

  it('uses the inward side normal when the spawn and player centers coincide', () => {
    expect(redAimDirection(10, 10, 10, 10, 'top')).toEqual({ x: 0, y: 1 });
    expect(redAimDirection(10, 10, 10, 10, 'right')).toEqual({ x: -1, y: 0 });
    expect(redAimDirection(10, 10, 10, 10, 'bottom')).toEqual({ x: 0, y: -1 });
    expect(redAimDirection(10, 10, 10, 10, 'left')).toEqual({ x: 1, y: 0 });
  });
});

describe('spawnRedSquare', () => {
  it('spawns outside the chosen edge at a 10-90% along-edge point', () => {
    const spawn = spawnAt({ rng: createScriptedRng([0, 0.5]) });

    expect(spawn.mark).toEqual({ side: 'top', alongPx: 400, atMs: 2_000 });
    expect(spawn.slot.x).toBe(400);
    expect(spawn.slot.y).toBe(-80);
    expect(spawn.slot.spawnSide).toBe('top');
    expect(spawn.slot.sizePx).toBe(RED_SQUARE_SIZE_PX);
  });

  it('maps each side index to its edge and spawn coordinate', () => {
    const top = spawnAt({ rng: createScriptedRng([0, 0]) });
    const right = spawnAt({ rng: createScriptedRng([0.3, 0]) });
    const bottom = spawnAt({ rng: createScriptedRng([0.6, 0]) });
    const left = spawnAt({ rng: createScriptedRng([0.9, 0]) });

    expect(top.slot.spawnSide).toBe('top');
    expect(top.slot.y).toBe(-80);
    expect(right.slot.spawnSide).toBe('right');
    expect(right.slot.x).toBe(880);
    expect(bottom.slot.spawnSide).toBe('bottom');
    expect(bottom.slot.y).toBe(680);
    expect(left.slot.spawnSide).toBe('left');
    expect(left.slot.x).toBe(-80);
  });

  it('computes the spawn center before aiming at the player', () => {
    const spawn = spawnAt({ rng: createScriptedRng([0.3, 0]) });
    const deltaX = PLAYER.x - spawn.slot.x;
    const deltaY = PLAYER.y - spawn.slot.y;
    const distance = Math.hypot(deltaX, deltaY);

    expect(spawn.slot.dirX).toBeCloseTo(deltaX / distance);
    expect(spawn.slot.dirY).toBeCloseTo(deltaY / distance);
    expect(Math.hypot(spawn.slot.dirX, spawn.slot.dirY)).toBeCloseTo(1);
  });

  it('applies the same-kind spacing shift without consuming extra RNG', () => {
    const rng = createScriptedRng([0, 0.5]);
    const spawn = spawnAt({
      rng,
      spawnedAtMs: 2_500,
      lastSpawn: { side: 'top', alongPx: 400, atMs: 2_000 },
    });

    expect(spawn.mark.alongPx).toBe(272);
    expect(rng.getState()).toBe(2);
  });

  it('samples the speed once from the spawn time', () => {
    const spawn = spawnAt({ rng: createScriptedRng([0, 0.5]), spawnedAtMs: 300_000 });

    expect(spawn.slot.speedPxPerSec).toBeCloseTo(166.4);
    expect(spawn.slot.spawnedAtMs).toBe(300_000);
  });

  it('starts outside, undamaged, and not yet entered', () => {
    const spawn = spawnAt({ rng: createScriptedRng([0, 0.5]) });

    expect(spawn.slot.enteredViewport).toBe(false);
    expect(spawn.slot.damagedPlayer).toBe(false);
  });

  it('consumes exactly two red draws in side-then-position order', () => {
    const rng = createRng(12_345);
    const expected = createRng(12_345);
    expected.nextInt(4);
    expected.next();

    spawnRedSquare({
      id: 0,
      rng,
      viewport: VIEWPORT,
      playerCenter: PLAYER,
      spawnedAtMs: 2_000,
      lastSpawn: null,
    });

    expect(rng.getState()).toBe(expected.getState());
  });
});

describe('stepRedSquare', () => {
  it('moves exactly speed times 20 ms along the fixed direction', () => {
    const { slot } = spawnAt({ rng: createScriptedRng([0, 0.5]) });
    const next = stepRedSquare(slot);

    expect(next.x).toBeCloseTo(slot.x + slot.dirX * slot.speedPxPerSec * 0.02);
    expect(next.y).toBeCloseTo(slot.y + slot.dirY * slot.speedPxPerSec * 0.02);
  });

  it('does not retarget, rotate, or rescale after spawn', () => {
    const { slot } = spawnAt({ rng: createScriptedRng([0, 0.5]) });
    const first = stepRedSquare(slot);
    const second = stepRedSquare(first);

    expect(second.dirX).toBe(slot.dirX);
    expect(second.dirY).toBe(slot.dirY);
    expect(second.speedPxPerSec).toBe(slot.speedPxPerSec);
    expect(second.spawnedAtMs).toBe(slot.spawnedAtMs);
  });

  it('keeps the 80% hitbox axis-aligned because the square never rotates', () => {
    const { slot } = spawnAt({ rng: createScriptedRng([0, 0.5]) });
    const next = stepRedSquare(slot);

    expect(next.sizePx).toBe(32);
    expect(next).not.toHaveProperty('rotation');
  });
});

describe('entry and recycle', () => {
  it('does not recycle on the spawn step even though the square is outside', () => {
    const { slot } = spawnAt({ rng: createScriptedRng([0, 0.5]) });

    expect(shouldRecycleRedSquare(slot, VIEWPORT, 2_020)).toBe(false);
    expect(markRedEntered(slot, VIEWPORT)).toBe(slot);
  });

  it('marks entry when the hitbox first overlaps the viewport', () => {
    const { slot } = spawnAt({ rng: createScriptedRng([0, 0.5]) });
    const entered = markRedEntered({ ...slot, y: 0 }, VIEWPORT);

    expect(entered.enteredViewport).toBe(true);
    expect(markRedEntered(entered, VIEWPORT)).toBe(entered);
  });

  it('recycles an entered square only after it is fully 64 px outside', () => {
    const { slot } = spawnAt({ rng: createScriptedRng([0, 0.5]) });
    const entered = { ...slot, enteredViewport: true, x: 876.7, y: 300 };

    expect(shouldRecycleRedSquare(entered, VIEWPORT, 2_020)).toBe(false);
    expect(shouldRecycleRedSquare({ ...entered, x: 877 }, VIEWPORT, 2_020)).toBe(true);
  });

  it('recycles on any exit edge, not only the opposite of the spawn side', () => {
    const { slot } = spawnAt({ rng: createScriptedRng([0, 0.5]) });
    const entered = { ...slot, enteredViewport: true, y: 700 };

    expect(shouldRecycleRedSquare(entered, VIEWPORT, 2_020)).toBe(true);
  });

  it('frees a square that never entered after the 30 second safety lifetime', () => {
    const { slot } = spawnAt({ rng: createScriptedRng([0, 0.5]) });
    const age = RED_SQUARE_SAFETY_LIFETIME_MS;

    expect(shouldRecycleRedSquare(slot, VIEWPORT, slot.spawnedAtMs + age - 1)).toBe(false);
    expect(shouldRecycleRedSquare(slot, VIEWPORT, slot.spawnedAtMs + age)).toBe(true);
  });
});
