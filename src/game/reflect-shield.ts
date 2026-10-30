import { CHARGE_SPEED_MS } from './upgrades';

export const SHIELD_LENGTH_PX = 64;
export const SHIELD_ORBIT_GAP_PX = 14;
export const DEFAULT_RECHARGE_MS = 4_000;
export const MAX_REFLECT_CHARGES = 3;

export type ReflectInputPhase = 'idle' | 'armed' | 'spent';

export interface ReflectShieldState {
  readonly maxCharges: number;
  readonly charges: number;
  readonly rechargeMs: number;
  readonly rechargeElapsedMs: number;
}

export interface ShieldPoint {
  readonly x: number;
  readonly y: number;
}

export interface ShieldNormal {
  readonly x: number;
  readonly y: number;
}

export interface ShieldSegment {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly midpointX: number;
  readonly midpointY: number;
  readonly normalX: number;
  readonly normalY: number;
}

const INITIAL_NORMAL: ShieldNormal = { x: 0, y: -1 };

export function createReflectShieldState(
  maxCharges: number,
  rechargeMs: number,
): ReflectShieldState {
  const normalizedMax = Number.isFinite(maxCharges)
    ? Math.min(MAX_REFLECT_CHARGES, Math.max(0, Math.floor(maxCharges)))
    : 0;
  const normalizedRechargeMs = CHARGE_SPEED_MS.some((value) => value === rechargeMs)
    ? rechargeMs
    : DEFAULT_RECHARGE_MS;

  return {
    maxCharges: normalizedMax,
    charges: normalizedMax,
    rechargeMs: normalizedRechargeMs,
    rechargeElapsedMs: 0,
  };
}

export function advanceReflectShield(state: ReflectShieldState, dtMs: number): ReflectShieldState {
  if (
    state.maxCharges === 0 ||
    state.charges >= state.maxCharges ||
    !Number.isFinite(dtMs) ||
    dtMs <= 0
  ) {
    return state;
  }

  let charges = state.charges;
  let elapsedMs = state.rechargeElapsedMs + Math.floor(dtMs);

  while (elapsedMs >= state.rechargeMs && charges < state.maxCharges) {
    elapsedMs -= state.rechargeMs;
    charges += 1;
  }

  if (charges >= state.maxCharges) {
    elapsedMs = 0;
  }

  if (charges === state.charges && elapsedMs === state.rechargeElapsedMs) {
    return state;
  }

  return {
    ...state,
    charges,
    rechargeElapsedMs: elapsedMs,
  };
}

export function spendReflectCharge(state: ReflectShieldState): ReflectShieldState {
  if (state.charges <= 0) {
    return state;
  }

  return {
    ...state,
    charges: state.charges - 1,
  };
}

export function getRingProgress(state: ReflectShieldState): number {
  if (state.charges >= state.maxCharges) {
    return 1;
  }

  if (state.rechargeMs <= 0) {
    return 0;
  }

  return clampProgress(state.rechargeElapsedMs / state.rechargeMs);
}

export function getShieldSegment(
  playerCenter: ShieldPoint,
  playerSize: number,
  normal: ShieldNormal,
  gap: number = SHIELD_ORBIT_GAP_PX,
): ShieldSegment {
  const normalized = normalizeNormal(normal);
  const safeSize = Number.isFinite(playerSize) ? Math.max(0, playerSize) : 0;
  const safeGap = Number.isFinite(gap) ? Math.max(0, gap) : SHIELD_ORBIT_GAP_PX;
  const orbitRadius = safeSize / 2 + safeGap;
  const tangentX = -normalized.y;
  const tangentY = normalized.x;
  const midpointX = playerCenter.x + normalized.x * orbitRadius;
  const midpointY = playerCenter.y + normalized.y * orbitRadius;
  const halfLength = SHIELD_LENGTH_PX / 2;

  return {
    ax: midpointX - tangentX * halfLength,
    ay: midpointY - tangentY * halfLength,
    bx: midpointX + tangentX * halfLength,
    by: midpointY + tangentY * halfLength,
    midpointX,
    midpointY,
    normalX: normalized.x,
    normalY: normalized.y,
  };
}

function normalizeNormal(normal: ShieldNormal): ShieldNormal {
  const magnitude = Math.hypot(normal.x, normal.y);

  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return INITIAL_NORMAL;
  }

  return {
    x: normal.x / magnitude,
    y: normal.y / magnitude,
  };
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
