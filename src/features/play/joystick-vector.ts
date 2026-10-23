import type { MovementInput } from '@/game/player';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface JoystickVector {
  readonly vector: MovementInput;
  readonly offset: Point;
}

export const JOYSTICK_RADIUS = 56;
export const JOYSTICK_DEAD_ZONE = 8;

export function getJoystickVector(
  anchor: Point,
  point: Point,
  radius: number = JOYSTICK_RADIUS,
  deadZone: number = JOYSTICK_DEAD_ZONE,
): JoystickVector {
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const distance = Math.hypot(dx, dy);

  if (radius <= 0 || distance <= deadZone) {
    return { vector: { x: 0, y: 0 }, offset: { x: 0, y: 0 } };
  }

  const limited = Math.min(distance, radius);
  const magnitude = limited / radius;
  const directionX = dx / distance;
  const directionY = dy / distance;

  return {
    vector: {
      x: directionX * magnitude,
      y: directionY * magnitude,
    },
    offset: {
      x: directionX * limited,
      y: directionY * limited,
    },
  };
}
