import { describe, expect, it } from 'vitest';

import {
  TRIANGLE_BEAM_LINGER_MS,
  TRIANGLE_BEAM_WIDTH_PX,
  TRIANGLE_SAFETY_LIFETIME_MS,
  TRIANGLE_SIZE_PX,
  chargeMsAtMs,
  createBeamLane,
  markTriangleEntered,
  shouldRecycleTriangle,
  spawnTriangle,
  startTriangleCharge,
  stepTriangle,
  triangleApproachSpeedAtMs,
  type TriangleSlot,
  type TriangleSpawn,
  type TriangleStepResult,
} from './enemy-orange-triangle';
import {
  createEnemyWorld,
  getChargingCount,
  stepEnemies,
  type EnemySlot,
  type EnemyWorld,
} from './enemy-world';

import type { Rng } from './rng';

const VIEWPORT = { left: 0, top: 0, width: 800, height: 600 };
const PLAYER = { x: 400, y: 300 };
const HURTBOX = { x: 400, y: 300, halfWidth: 25.6, halfHeight: 25.6 };

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

function spawnAt(
  rng: Rng,
  options: {
    readonly viewport?: {
      readonly left: number;
      readonly top: number;
      readonly width: number;
      readonly height: number;
    };
    readonly playerCenter?: { readonly x: number; readonly y: number };
    readonly spawnedAtMs?: number;
    readonly lastSpawn?: {
      readonly side: 'top' | 'right' | 'bottom' | 'left';
      readonly alongPx: number;
      readonly atMs: number;
    } | null;
  } = {},
) {
  return spawnTriangle({
    id: 0,
    rng,
    viewport: options.viewport ?? VIEWPORT,
    playerCenter: options.playerCenter ?? PLAYER,
    spawnedAtMs: options.spawnedAtMs ?? 45_000,
    lastSpawn: options.lastSpawn ?? null,
  });
}

function requireSpawn(result: TriangleSpawn | null): TriangleSpawn {
  if (result === null) {
    throw new Error('Expected a triangle spawn.');
  }

  return result;
}

function requireStep(result: TriangleStepResult | null): TriangleStepResult {
  if (result === null) {
    throw new Error('Expected a triangle step.');
  }

  return result;
}

function makeTriangle(
  id: number,
  overrides: Partial<Omit<TriangleSlot, 'id' | 'kind'>> = {},
): TriangleSlot {
  return {
    id,
    kind: 'orange-triangle',
    phase: 'approach',
    x: 100,
    y: 100,
    stopX: 200,
    stopY: 100,
    aimX: 1,
    aimY: 0,
    approachSpeedPxPerSec: 100,
    exitSpeedPxPerSec: 125,
    spawnedAtMs: 0,
    arrivedAtMs: null,
    chargeEndsAtMs: null,
    beamEndsAtMs: null,
    lane: null,
    sizePx: TRIANGLE_SIZE_PX,
    enteredViewport: false,
    damagedPlayer: false,
    ...overrides,
  };
}

function makeAimedTriangle(id = 0, arrivedAtMs = 1_000): TriangleSlot {
  return makeTriangle(id, {
    phase: 'aimed',
    x: 200,
    y: 100,
    stopX: 200,
    stopY: 100,
    aimX: 1,
    aimY: 0,
    arrivedAtMs,
    lane: createBeamLane(200, 100, 1, 0, VIEWPORT),
  });
}

function worldWithTriangles(triangles: readonly TriangleSlot[]): EnemyWorld {
  const base = createEnemyWorld(42);
  const slots: (EnemySlot | null)[] = [...base.slots];

  for (const triangle of triangles) {
    slots[triangle.id] = triangle;
  }

  return {
    ...base,
    slots,
    nextRedSpawnAtMs: 100_000,
    nextTriangleSpawnAtMs: 100_000,
  };
}

function phaseAt(world: EnemyWorld, id: number): string {
  const slot = world.slots[id];

  if (slot === undefined || slot === null) {
    throw new Error(`Slot ${id} is empty.`);
  }

  return slot.kind === 'orange-triangle' ? slot.phase : slot.kind;
}

describe('triangle difficulty values', () => {
  it('matches the approach speed formula', () => {
    expect(triangleApproachSpeedAtMs(0)).toBeCloseTo(89.6);
    expect(triangleApproachSpeedAtMs(45_000)).toBeCloseTo(95.36);
    expect(triangleApproachSpeedAtMs(300_000)).toBeCloseTo(128);
    expect(triangleApproachSpeedAtMs(675_000)).toBeCloseTo(176);
    expect(triangleApproachSpeedAtMs(1_000_000)).toBeCloseTo(176);
  });

  it('matches the charge duration formula at 45, 300, and 900 seconds', () => {
    expect(chargeMsAtMs(0)).toBe(1_600);
    expect(chargeMsAtMs(45_000)).toBe(1_555);
    expect(chargeMsAtMs(300_000)).toBe(1_300);
    expect(chargeMsAtMs(900_000)).toBe(700);
    expect(chargeMsAtMs(1_000_000)).toBe(700);
  });
});

describe('spawnTriangle', () => {
  it('spawns fully outside at 64 px on the chosen edge with a valid inset stop', () => {
    const spawn = requireSpawn(spawnAt(createScriptedRng([0, 0.5, 0.5, 0.5])));

    expect(spawn.mark).toEqual({ side: 'top', alongPx: 400, atMs: 45_000 });
    expect(spawn.slot.x).toBe(400);
    expect(spawn.slot.y).toBeCloseTo(-(64 + TRIANGLE_SIZE_PX / Math.SQRT2));
    expect(spawn.slot.sizePx).toBe(TRIANGLE_SIZE_PX);
    expect(spawn.slot.phase).toBe('approach');
    expect(spawn.slot.stopX).toBe(400);
    expect(spawn.slot.stopY).toBe(153);
    expect(spawn.slot.stopX).toBeGreaterThanOrEqual(48);
    expect(spawn.slot.stopX).toBeLessThanOrEqual(752);
    expect(spawn.slot.stopY).toBeGreaterThanOrEqual(48);
    expect(spawn.slot.stopY).toBeLessThanOrEqual(552);
    expect(
      Math.hypot(spawn.slot.stopX - PLAYER.x, spawn.slot.stopY - PLAYER.y),
    ).toBeGreaterThanOrEqual(128);
    expect(spawn.slot.aimX).toBeCloseTo(0);
    expect(spawn.slot.aimY).toBeCloseTo(1);
    expect(spawn.slot.approachSpeedPxPerSec).toBeCloseTo(95.36);
    expect(spawn.slot.exitSpeedPxPerSec).toBeCloseTo(119.2);
    expect(spawn.slot.lane).toBeNull();
  });

  it('maps a right-side spawn to the proper outside coordinate', () => {
    const spawn = requireSpawn(spawnAt(createScriptedRng([0.3, 0, 0.5, 0.5])));

    expect(spawn.mark.side).toBe('right');
    expect(spawn.mark.alongPx).toBe(60);
    expect(spawn.slot.x).toBeCloseTo(800 + 64 + TRIANGLE_SIZE_PX / Math.SQRT2);
    expect(spawn.slot.y).toBe(60);
    expect(spawn.slot.stopX).toBe(647);
    expect(spawn.slot.stopY).toBe(60);
  });

  it('applies the same-kind spacing shift before sampling the stop point', () => {
    const spawn = requireSpawn(
      spawnAt(createScriptedRng([0, 0.5, 0.5, 0.5]), {
        spawnedAtMs: 45_000,
        lastSpawn: { side: 'top', alongPx: 400, atMs: 44_000 },
      }),
    );

    expect(spawn.mark.alongPx).toBe(272);
    expect(spawn.slot.stopX).toBe(272);
  });

  it('accepts the first valid stop candidate with four draws', () => {
    const rng = createScriptedRng([0, 0.5, 0.5, 0.5]);
    const spawn = requireSpawn(spawnAt(rng));

    expect(spawn.slot.stopX).toBe(400);
    expect(spawn.slot.stopY).toBe(153);
    expect(rng.getState()).toBe(4);
  });

  it('tries a second candidate and stops drawing when it is valid', () => {
    const rng = createScriptedRng([0, 0.5, 0.5, 0.5, 0.5, 0.99]);
    const spawn = requireSpawn(spawnAt(rng, { playerCenter: { x: 400, y: 153 } }));

    expect(spawn.slot.stopX).toBe(547);
    expect(spawn.slot.stopY).toBe(153);
    expect(rng.getState()).toBe(6);
  });

  it('tries a third candidate and stops drawing when it is valid', () => {
    const rng = createScriptedRng([0, 0.5, 0.5, 0.5, 0.8, 0.5, 0.2, 0.99]);
    const spawn = requireSpawn(spawnAt(rng, { playerCenter: { x: 400, y: 153 } }));

    expect(spawn.slot.stopX).toBe(547);
    expect(spawn.slot.stopY).toBe(90);
    expect(rng.getState()).toBe(8);
  });

  it('accepts a stop exactly 128 px from the player', () => {
    const spawn = requireSpawn(
      spawnAt(createScriptedRng([0, 0.5, 0.5, 0.5]), {
        playerCenter: { x: 400, y: 281 },
      }),
    );

    expect(spawn.slot.stopX).toBe(400);
    expect(spawn.slot.stopY).toBe(153);
    expect(Math.hypot(spawn.slot.stopX - 400, spawn.slot.stopY - 281)).toBeCloseTo(128);
  });

  it('aborts with no slot after three invalid candidates and keeps the consumed draws', () => {
    const rng = createScriptedRng([0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const spawn = spawnAt(rng, { playerCenter: { x: 400, y: 150 } });

    expect(spawn).toBeNull();
    expect(rng.getState()).toBe(8);
  });

  it('aborts on an empty inset band after the side and position draws', () => {
    const rng = createScriptedRng([0, 0.5]);
    const spawn = spawnAt(rng, {
      viewport: { left: 0, top: 0, width: 60, height: 600 },
    });

    expect(spawn).toBeNull();
    expect(rng.getState()).toBe(2);
  });
});

describe('stepTriangle approach and arrival', () => {
  it('moves straight at the spawn speed and keeps its approach direction', () => {
    const slot = makeTriangle(0, { x: 0, y: 100, stopX: 100, stopY: 100, aimX: 1, aimY: 0 });
    const result = requireStep(
      stepTriangle(slot, { stepEndMs: 1_000, viewport: VIEWPORT, playerCenter: PLAYER }),
    );

    expect(result.fired).toBe(false);
    expect(result.slot.x).toBeCloseTo(2);
    expect(result.slot.y).toBe(100);
    expect(result.slot.phase).toBe('approach');
    expect(result.slot.aimX).toBe(1);
    expect(result.slot.aimY).toBe(0);
  });

  it('clamps to the stop, locks the aim at the player, and creates the lane', () => {
    const slot = makeTriangle(0, {
      x: 98,
      y: 100,
      stopX: 100,
      stopY: 100,
      aimX: 1,
      aimY: 0,
      approachSpeedPxPerSec: 100,
    });
    const result = requireStep(
      stepTriangle(slot, {
        stepEndMs: 1_000,
        viewport: VIEWPORT,
        playerCenter: { x: 200, y: 100 },
      }),
    );

    expect(result.slot.phase).toBe('aimed');
    expect(result.slot.x).toBe(100);
    expect(result.slot.y).toBe(100);
    expect(result.slot.arrivedAtMs).toBe(1_000);
    expect(result.slot.aimX).toBe(1);
    expect(result.slot.aimY).toBe(0);
    expect(result.slot.lane?.originX).toBe(120);
    expect(result.slot.lane?.originY).toBe(100);
    expect(result.slot.lane?.dirX).toBe(1);
    expect(result.slot.lane?.dirY).toBe(0);
    expect(result.slot.lane?.widthPx).toBe(TRIANGLE_BEAM_WIDTH_PX);
    expect(result.slot.lane?.lengthPx).toBe(744);
  });

  it('uses the approach direction when the player is closer than one pixel', () => {
    const slot = makeTriangle(0, {
      x: 100,
      y: 98,
      stopX: 100,
      stopY: 100,
      aimX: 0,
      aimY: 1,
      approachSpeedPxPerSec: 100,
    });
    const result = requireStep(
      stepTriangle(slot, {
        stepEndMs: 1_000,
        viewport: VIEWPORT,
        playerCenter: { x: 100.5, y: 100.5 },
      }),
    );

    expect(result.slot.aimX).toBe(0);
    expect(result.slot.aimY).toBe(1);
    expect(result.slot.lane?.originY).toBe(120);
  });

  it('never re-aims after arrival even when the player moves', () => {
    const arrived = requireStep(
      stepTriangle(makeTriangle(0, { x: 98, y: 100, stopX: 100, stopY: 100, aimX: 1, aimY: 0 }), {
        stepEndMs: 1_000,
        viewport: VIEWPORT,
        playerCenter: { x: 200, y: 100 },
      }),
    ).slot;

    const next = requireStep(
      stepTriangle(arrived, {
        stepEndMs: 1_020,
        viewport: VIEWPORT,
        playerCenter: { x: 700, y: 500 },
      }),
    );

    expect(next.slot.aimX).toBe(1);
    expect(next.slot.aimY).toBe(0);
    expect(next.slot.lane).toBe(arrived.lane);
  });

  it('frees the slot when a resize puts the stop outside the inset at arrival', () => {
    const slot = makeTriangle(0, {
      x: 698,
      y: 300,
      stopX: 700,
      stopY: 300,
      aimX: 1,
      aimY: 0,
      approachSpeedPxPerSec: 100,
    });

    expect(
      stepTriangle(slot, {
        stepEndMs: 1_000,
        viewport: { left: 0, top: 0, width: 400, height: 600 },
        playerCenter: PLAYER,
      }),
    ).toBeNull();
  });

  it('never reports a body hit while approaching, aimed, charging, firing, or exiting', () => {
    const aimed = makeAimedTriangle();
    const charging = startTriangleCharge(aimed, 1_000);
    const firing = makeTriangle(0, {
      phase: 'firing',
      beamEndsAtMs: 2_000,
      lane: createBeamLane(200, 100, 1, 0, VIEWPORT),
    });
    const exiting = makeTriangle(0, { phase: 'exiting', beamEndsAtMs: 1_000 });

    expect(
      stepTriangle(makeTriangle(0, { x: 395, y: 295 }), {
        stepEndMs: 1_000,
        viewport: VIEWPORT,
        playerCenter: PLAYER,
      })?.fired,
    ).toBe(false);
    expect(
      stepTriangle(aimed, { stepEndMs: 1_000, viewport: VIEWPORT, playerCenter: PLAYER })?.fired,
    ).toBe(false);
    expect(
      stepTriangle(charging, { stepEndMs: 1_200, viewport: VIEWPORT, playerCenter: PLAYER })?.fired,
    ).toBe(false);
    expect(
      stepTriangle(firing, { stepEndMs: 1_500, viewport: VIEWPORT, playerCenter: PLAYER })?.fired,
    ).toBe(false);
    expect(
      stepTriangle(exiting, { stepEndMs: 1_500, viewport: VIEWPORT, playerCenter: PLAYER })?.fired,
    ).toBe(false);
  });
});

describe('createBeamLane', () => {
  it('starts at the tip, uses the aim direction, and reaches the far edge plus 64 px', () => {
    const lane = createBeamLane(200, 100, 1, 0, VIEWPORT);

    expect(lane.originX).toBe(220);
    expect(lane.originY).toBe(100);
    expect(lane.dirX).toBe(1);
    expect(lane.dirY).toBe(0);
    expect(lane.widthPx).toBe(57.6);
    expect(lane.lengthPx).toBe(644);
  });

  it('uses the viewport origin when it is not at zero', () => {
    const lane = createBeamLane(300, 200, 1, 0, {
      left: 100,
      top: 50,
      width: 800,
      height: 600,
    });

    expect(lane.originX).toBe(320);
    expect(lane.originY).toBe(200);
    expect(lane.lengthPx).toBe(644);
  });

  it('reaches the nearest far boundary for a diagonal aim', () => {
    const diagonal = 1 / Math.sqrt(2);
    const lane = createBeamLane(100, 100, diagonal, diagonal, VIEWPORT);

    expect(lane.lengthPx).toBeCloseTo((600 - (100 + 20 * diagonal)) / diagonal + 64);
  });
});

describe('charge, fire, beam, and exit', () => {
  it('samples the charge duration at charge start', () => {
    const aimed = makeAimedTriangle();
    const charging = startTriangleCharge(aimed, 45_000);
    const later = startTriangleCharge(makeAimedTriangle(), 300_000);

    expect(charging.phase).toBe('charging');
    expect(charging.chargeEndsAtMs).toBe(46_555);
    expect(charging.lane).toBe(aimed.lane);
    expect(later.chargeEndsAtMs).toBe(301_300);
  });

  it('does not start a charge from a non-aimed phase or without a lane', () => {
    const approaching = makeTriangle(0);
    const aimedWithoutLane = makeTriangle(0, { phase: 'aimed', arrivedAtMs: 1_000 });

    expect(startTriangleCharge(approaching, 1_000)).toBe(approaching);
    expect(startTriangleCharge(aimedWithoutLane, 1_000)).toBe(aimedWithoutLane);
  });

  it('fires once on the first step at or after the charge threshold', () => {
    const charging = startTriangleCharge(makeAimedTriangle(), 45_000);
    const before = requireStep(
      stepTriangle(charging, {
        stepEndMs: 46_554,
        viewport: VIEWPORT,
        playerCenter: PLAYER,
      }),
    );
    const fired = requireStep(
      stepTriangle(charging, {
        stepEndMs: 46_555,
        viewport: VIEWPORT,
        playerCenter: PLAYER,
      }),
    );

    expect(before.fired).toBe(false);
    expect(before.slot.phase).toBe('charging');
    expect(fired.fired).toBe(true);
    expect(fired.slot.phase).toBe('firing');
    expect(fired.slot.beamEndsAtMs).toBe(46_735);
    expect(fired.slot.lane).toBe(charging.lane);
  });

  it('does not fire again while the beam is visible', () => {
    const fired = requireStep(
      stepTriangle(startTriangleCharge(makeAimedTriangle(), 45_000), {
        stepEndMs: 46_555,
        viewport: VIEWPORT,
        playerCenter: PLAYER,
      }),
    );
    const next = requireStep(
      stepTriangle(fired.slot, {
        stepEndMs: 46_575,
        viewport: VIEWPORT,
        playerCenter: PLAYER,
      }),
    );

    expect(next.fired).toBe(false);
    expect(next.slot.phase).toBe('firing');
    expect(next.slot.x).toBe(200);
    expect(next.slot.lane).toBe(fired.slot.lane);
  });

  it('holds for 180 ms, then exits on the threshold step at the exit speed', () => {
    const firing = makeTriangle(0, {
      phase: 'firing',
      x: 200,
      y: 100,
      beamEndsAtMs: 1_180,
      exitSpeedPxPerSec: 125,
      lane: createBeamLane(200, 100, 1, 0, VIEWPORT),
    });
    const before = requireStep(
      stepTriangle(firing, {
        stepEndMs: 1_179,
        viewport: VIEWPORT,
        playerCenter: PLAYER,
      }),
    );
    const exiting = requireStep(
      stepTriangle(firing, {
        stepEndMs: 1_180,
        viewport: VIEWPORT,
        playerCenter: PLAYER,
      }),
    );

    expect(before.slot.phase).toBe('firing');
    expect(before.slot.x).toBe(200);
    expect(exiting.fired).toBe(false);
    expect(exiting.slot.phase).toBe('exiting');
    expect(exiting.slot.x).toBeCloseTo(202.5);
    expect(exiting.slot.lane).toBe(firing.lane);
    expect(TRIANGLE_BEAM_LINGER_MS).toBe(180);
  });

  it('continues exiting along the locked aim at the exit speed', () => {
    const exiting = makeTriangle(0, {
      phase: 'exiting',
      x: 200,
      y: 100,
      aimX: 0,
      aimY: -1,
      exitSpeedPxPerSec: 100,
      beamEndsAtMs: 1_000,
    });
    const next = requireStep(
      stepTriangle(exiting, {
        stepEndMs: 1_100,
        viewport: VIEWPORT,
        playerCenter: { x: 700, y: 500 },
      }),
    );

    expect(next.slot.x).toBe(200);
    expect(next.slot.y).toBeCloseTo(98);
    expect(next.slot.aimX).toBe(0);
    expect(next.slot.aimY).toBe(-1);
  });
});

describe('entry and recycle', () => {
  it('marks entry when the axis-aligned body hitbox overlaps the viewport', () => {
    const triangle = makeTriangle(0, { x: 0, y: 300 });
    const entered = markTriangleEntered(triangle, VIEWPORT);

    expect(entered.enteredViewport).toBe(true);
    expect(markTriangleEntered(entered, VIEWPORT)).toBe(entered);
  });

  it('recycles only after entering and passing 64 px beyond the viewport', () => {
    const triangle = makeTriangle(0, { x: 879.9, enteredViewport: true });
    const outside = { ...triangle, x: 881 };

    expect(shouldRecycleTriangle(triangle, VIEWPORT, 1_000)).toBe(false);
    expect(shouldRecycleTriangle(outside, VIEWPORT, 1_000)).toBe(true);
  });

  it('frees a triangle that never entered after the 30 second safety lifetime', () => {
    const triangle = makeTriangle(0, { x: 400, y: -100, spawnedAtMs: 5_000 });

    expect(shouldRecycleTriangle(triangle, VIEWPORT, 5_000 + TRIANGLE_SAFETY_LIFETIME_MS - 1)).toBe(
      false,
    );
    expect(shouldRecycleTriangle(triangle, VIEWPORT, 5_000 + TRIANGLE_SAFETY_LIFETIME_MS)).toBe(
      true,
    );
  });
});

describe('triangle scheduling integration', () => {
  it('attempts the first triangle at 45 000 ms and then on the 1 600 ms cadence', () => {
    const viewport = { left: 0, top: 0, width: 2_000, height: 2_000 };
    const hurtbox = { x: 1_000, y: 1_000, halfWidth: 25.6, halfHeight: 25.6 };
    const world = createEnemyWorld(7);

    const beforeUnlock = stepEnemies(world, {
      stepEndMs: 1_999,
      viewport,
      playerHurtbox: hurtbox,
      playerAlive: true,
    });
    const unlocked = stepEnemies(beforeUnlock.world, {
      stepEndMs: 2_000,
      viewport,
      playerHurtbox: hurtbox,
      playerAlive: true,
    });

    expect(unlocked.world.slots.filter((slot) => slot?.kind === 'orange-triangle')).toHaveLength(1);
    expect(unlocked.world.nextTriangleSpawnAtMs).toBe(2_900);

    const nextAttempt = stepEnemies(unlocked.world, {
      stepEndMs: 2_900,
      viewport,
      playerHurtbox: hurtbox,
      playerAlive: true,
    });

    expect(nextAttempt.world.nextTriangleSpawnAtMs).toBe(3_800);
  });

  it('resolves a hitscan laser once at the fire instant', () => {
    const lane = createBeamLane(200, 300, 1, 0, VIEWPORT);
    const triangle = makeTriangle(0, {
      phase: 'charging',
      x: 200,
      y: 300,
      stopX: 200,
      stopY: 300,
      aimX: 1,
      aimY: 0,
      arrivedAtMs: 500,
      chargeEndsAtMs: 1_000,
      lane,
      spawnedAtMs: 500,
    });
    const world = worldWithTriangles([triangle]);
    const fired = stepEnemies(world, {
      stepEndMs: 1_000,
      viewport: VIEWPORT,
      playerHurtbox: HURTBOX,
      playerAlive: true,
    });
    const again = stepEnemies(fired.world, {
      stepEndMs: 1_020,
      viewport: VIEWPORT,
      playerHurtbox: HURTBOX,
      playerAlive: true,
    });

    expect(fired.hit).toEqual({ slotId: 0, kind: 'orange-triangle', atMs: 1_000 });
    expect(again.hit).toBeNull();
  });

  it('allows at most six charging triangles and waits for arrival order', () => {
    const lane = createBeamLane(200, 100, 1, 0, VIEWPORT);
    const firing = makeTriangle(0, {
      phase: 'charging',
      x: 200,
      y: 100,
      stopX: 200,
      stopY: 100,
      aimX: 1,
      aimY: 0,
      arrivedAtMs: 500,
      chargeEndsAtMs: 1_000,
      lane,
    });
    const waiters = Array.from({ length: 6 }, (_, index) =>
      makeTriangle(index + 1, {
        phase: 'aimed',
        x: 200,
        y: 100,
        stopX: 200,
        stopY: 100,
        aimX: 1,
        aimY: 0,
        arrivedAtMs: 600 + index * 100,
        lane,
      }),
    );
    const world = worldWithTriangles([firing, ...waiters]);

    const firstStep = stepEnemies(world, {
      stepEndMs: 1_000,
      viewport: VIEWPORT,
      playerHurtbox: HURTBOX,
      playerAlive: true,
    });
    const secondStep = stepEnemies(firstStep.world, {
      stepEndMs: 1_020,
      viewport: VIEWPORT,
      playerHurtbox: HURTBOX,
      playerAlive: true,
    });

    expect(phaseAt(firstStep.world, 0)).toBe('firing');
    expect(phaseAt(firstStep.world, 1)).toBe('charging');
    expect(phaseAt(firstStep.world, 6)).toBe('aimed');
    expect(getChargingCount(firstStep.world)).toBe(5);
    expect(phaseAt(secondStep.world, 6)).toBe('charging');
    expect(getChargingCount(secondStep.world)).toBe(6);
  });
});
