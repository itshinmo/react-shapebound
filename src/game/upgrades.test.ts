import { describe, expect, it } from 'vitest';

import {
  UPGRADE_KEYS,
  UPGRADE_MAX_LEVELS,
  createEmptyUpgrades,
  deriveLoadout,
  isUpgradeLevels,
  type UpgradeLevels,
} from './upgrades';

function levels(overrides: Partial<UpgradeLevels> = {}): UpgradeLevels {
  return { ...createEmptyUpgrades(), ...overrides };
}

describe('upgrade keys and maxima', () => {
  it('exports the seven known keys in save order', () => {
    expect(UPGRADE_KEYS).toEqual([
      'barrierCount',
      'movementSpeed',
      'playerSize',
      'arenaSize',
      'reflectCharges',
      'reflectChargeSpeed',
      'laserPierce',
    ]);
  });

  it('locks the maxima from the approved table', () => {
    expect(UPGRADE_MAX_LEVELS).toEqual({
      barrierCount: 3,
      movementSpeed: 5,
      playerSize: 5,
      arenaSize: 5,
      reflectCharges: 3,
      reflectChargeSpeed: 4,
      laserPierce: 2,
    });
  });

  it('creates all seven levels at zero', () => {
    expect(createEmptyUpgrades()).toEqual({
      barrierCount: 0,
      movementSpeed: 0,
      playerSize: 0,
      arenaSize: 0,
      reflectCharges: 0,
      reflectChargeSpeed: 0,
      laserPierce: 0,
    });
  });
});

describe('isUpgradeLevels', () => {
  it('accepts valid and maximum levels', () => {
    expect(isUpgradeLevels(createEmptyUpgrades())).toBe(true);
    expect(
      isUpgradeLevels({
        barrierCount: 3,
        movementSpeed: 5,
        playerSize: 5,
        arenaSize: 5,
        reflectCharges: 3,
        reflectChargeSpeed: 4,
        laserPierce: 2,
      }),
    ).toBe(true);
  });

  it('rejects every missing key', () => {
    for (const key of UPGRADE_KEYS) {
      const value: Record<string, number> = {};

      for (const other of UPGRADE_KEYS) {
        if (other !== key) {
          value[other] = 0;
        }
      }

      expect(isUpgradeLevels(value)).toBe(false);
    }
  });

  it('rejects negative, fractional, unsafe, non-number, and above-max levels', () => {
    for (const key of UPGRADE_KEYS) {
      const aboveMax = UPGRADE_MAX_LEVELS[key] + 1;

      for (const value of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, '1', aboveMax]) {
        expect(isUpgradeLevels({ ...createEmptyUpgrades(), [key]: value })).toBe(false);
      }
    }
  });

  it('rejects null, arrays, and strings as the levels object', () => {
    expect(isUpgradeLevels(null)).toBe(false);
    expect(isUpgradeLevels([])).toBe(false);
    expect(isUpgradeLevels('levels')).toBe(false);
  });

  it('accepts extra keys', () => {
    expect(isUpgradeLevels({ ...createEmptyUpgrades(), futureNode: 7 })).toBe(true);
  });
});

describe('deriveLoadout', () => {
  it('matches the level-0 baseline', () => {
    expect(deriveLoadout(createEmptyUpgrades())).toEqual({
      speed: 180,
      playerSize: 64,
      arenaSize: 320,
      maxBarrier: 0,
      maxReflectCharges: 0,
      rechargeMs: 4_000,
      pierce: 0,
    });
  });

  it('matches every locked curve at every level', () => {
    const expected = {
      movementSpeed: [180, 190, 200, 210, 220, 230],
      playerSize: [64, 56, 48, 40, 32, 24],
      arenaSize: [320, 340, 360, 380, 400, 420],
      reflectChargeSpeed: [4_000, 3_500, 3_000, 2_500, 2_000],
    } as const;

    expected.movementSpeed.forEach((speed, level) => {
      expect(deriveLoadout(levels({ movementSpeed: level })).speed).toBe(speed);
    });

    expected.playerSize.forEach((playerSize, level) => {
      expect(deriveLoadout(levels({ playerSize: level })).playerSize).toBe(playerSize);
    });

    expected.arenaSize.forEach((arenaSize, level) => {
      expect(deriveLoadout(levels({ arenaSize: level })).arenaSize).toBe(arenaSize);
    });

    expected.reflectChargeSpeed.forEach((rechargeMs, level) => {
      expect(deriveLoadout(levels({ reflectChargeSpeed: level })).rechargeMs).toBe(rechargeMs);
    });
  });

  it('matches the barrier, reflect charge, and pierce levels', () => {
    for (const level of [0, 1, 2, 3]) {
      expect(deriveLoadout(levels({ barrierCount: level })).maxBarrier).toBe(level);
      expect(deriveLoadout(levels({ reflectCharges: level })).maxReflectCharges).toBe(level);
    }

    for (const level of [0, 1, 2]) {
      expect(deriveLoadout(levels({ laserPierce: level })).pierce).toBe(level);
    }
  });

  it('derives the loadout from all seven levels at once', () => {
    expect(
      deriveLoadout({
        barrierCount: 2,
        movementSpeed: 4,
        playerSize: 3,
        arenaSize: 5,
        reflectCharges: 1,
        reflectChargeSpeed: 2,
        laserPierce: 1,
      }),
    ).toEqual({
      speed: 220,
      playerSize: 40,
      arenaSize: 420,
      maxBarrier: 2,
      maxReflectCharges: 1,
      rechargeMs: 3_000,
      pierce: 1,
    });
  });
});
