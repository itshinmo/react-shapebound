export interface PlayerStats {
  readonly speed: number;
  readonly size: number;
  readonly maxHealth: number;
}

export interface PlayerState {
  readonly x: number;
  readonly y: number;
  readonly speed: number;
  readonly size: number;
  readonly health: 0 | 1;
  readonly shield: number;
  readonly alive: boolean;
}

export interface MovementInput {
  readonly x: number;
  readonly y: number;
}

export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export const PLAYER_BASE_STATS: PlayerStats = {
  speed: 180,
  size: 64,
  maxHealth: 1,
};

export const PLAYER_CONTAINER_SIZE = 320;

export function createPlayer(stats: PlayerStats, bounds: Bounds): PlayerState {
  const shield = Math.max(0, Math.floor(stats.maxHealth) - 1);

  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    speed: stats.speed,
    size: stats.size,
    health: 1,
    shield,
    alive: true,
  };
}

export function clampPlayerToBounds(player: PlayerState, bounds: Bounds): PlayerState {
  const x = clampCenter(player.x, player.size, bounds.left, bounds.width);
  const y = clampCenter(player.y, player.size, bounds.top, bounds.height);

  if (x === player.x && y === player.y) {
    return player;
  }

  return { ...player, x, y };
}

export function stepPlayer(
  player: PlayerState,
  input: MovementInput,
  dtSeconds: number,
  bounds: Bounds,
): PlayerState {
  if (!player.alive || !Number.isFinite(dtSeconds) || dtSeconds <= 0) {
    return player;
  }

  const inputX = Number.isFinite(input.x) ? input.x : 0;
  const inputY = Number.isFinite(input.y) ? input.y : 0;
  const magnitude = Math.hypot(inputX, inputY);

  if (magnitude === 0) {
    return player;
  }

  const scale = magnitude > 1 ? 1 / magnitude : 1;
  const distance = player.speed * dtSeconds;

  return {
    ...player,
    x: clampCenter(player.x + inputX * scale * distance, player.size, bounds.left, bounds.width),
    y: clampCenter(player.y + inputY * scale * distance, player.size, bounds.top, bounds.height),
  };
}

export function applyDamage(player: PlayerState, amount: number): PlayerState {
  if (!player.alive || !Number.isFinite(amount) || amount <= 0) {
    return player;
  }

  const damage = Math.floor(amount);

  if (damage === 0) {
    return player;
  }

  const absorbed = Math.min(player.shield, damage);
  const remaining = damage - absorbed;
  const health: 0 | 1 = remaining > 0 ? 0 : 1;

  return {
    ...player,
    health,
    shield: health === 1 ? player.shield - absorbed : 0,
    alive: health === 1,
  };
}

function clampCenter(value: number, size: number, origin: number, extent: number): number {
  if (!Number.isFinite(extent) || extent <= 0) {
    return origin;
  }

  if (extent < size) {
    return origin + extent / 2;
  }

  const half = size / 2;

  return Math.min(Math.max(value, origin + half), origin + extent - half);
}
