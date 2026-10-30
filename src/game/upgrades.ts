export const UPGRADE_KEYS = [
  'barrierCount',
  'movementSpeed',
  'playerSize',
  'arenaSize',
  'reflectCharges',
  'reflectChargeSpeed',
  'laserPierce',
] as const;

export type UpgradeKey = (typeof UPGRADE_KEYS)[number];

export type UpgradeLevels = Readonly<Record<UpgradeKey, number>>;

export const UPGRADE_MAX_LEVELS: Readonly<Record<UpgradeKey, number>> = {
  barrierCount: 3,
  movementSpeed: 5,
  playerSize: 5,
  arenaSize: 5,
  reflectCharges: 3,
  reflectChargeSpeed: 4,
  laserPierce: 2,
};

export const MOVEMENT_SPEED_PX_PER_SECOND = [180, 190, 200, 210, 220, 230] as const;
export const PLAYER_SIZE_PX = [64, 56, 48, 40, 32, 24] as const;
export const ARENA_SIZE_PX = [320, 340, 360, 380, 400, 420] as const;
export const CHARGE_SPEED_MS = [4_000, 3_500, 3_000, 2_500, 2_000] as const;

export interface RunLoadout {
  readonly speed: number;
  readonly playerSize: number;
  readonly arenaSize: number;
  readonly maxBarrier: number;
  readonly maxReflectCharges: number;
  readonly rechargeMs: number;
  readonly pierce: number;
}

export function createEmptyUpgrades(): UpgradeLevels {
  return {
    barrierCount: 0,
    movementSpeed: 0,
    playerSize: 0,
    arenaSize: 0,
    reflectCharges: 0,
    reflectChargeSpeed: 0,
    laserPierce: 0,
  };
}

export function isUpgradeKey(value: unknown): value is UpgradeKey {
  return typeof value === 'string' && (UPGRADE_KEYS as readonly string[]).includes(value);
}

export function isUpgradeLevels(value: unknown): value is UpgradeLevels {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const levels = value as Record<string, unknown>;

  return UPGRADE_KEYS.every((key) => {
    const level = levels[key];

    return (
      typeof level === 'number' &&
      Number.isSafeInteger(level) &&
      level >= 0 &&
      level <= UPGRADE_MAX_LEVELS[key]
    );
  });
}

export function deriveLoadout(levels: UpgradeLevels): RunLoadout {
  return {
    speed: curveValue(MOVEMENT_SPEED_PX_PER_SECOND, levels.movementSpeed),
    playerSize: curveValue(PLAYER_SIZE_PX, levels.playerSize),
    arenaSize: curveValue(ARENA_SIZE_PX, levels.arenaSize),
    maxBarrier: levels.barrierCount,
    maxReflectCharges: levels.reflectCharges,
    rechargeMs: curveValue(CHARGE_SPEED_MS, levels.reflectChargeSpeed),
    pierce: levels.laserPierce,
  };
}

function curveValue(curve: readonly number[], level: number): number {
  return curve[level] ?? curve[0] ?? 0;
}
