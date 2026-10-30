import { useCallback, useEffect, useRef, useState } from 'react';

import type { MovementInput } from '@/game/player';

import { getJoystickVector } from './joystick-vector';

import type { ShieldSource } from './shield-input';
import type { PointerEventHandler, RefObject } from 'react';

export interface JoystickState {
  readonly pointerId: number;
  readonly anchorX: number;
  readonly anchorY: number;
}

interface TouchPointerHandlers {
  readonly onPointerDown: PointerEventHandler<HTMLElement>;
  readonly onPointerMove: PointerEventHandler<HTMLElement>;
  readonly onPointerUp: PointerEventHandler<HTMLElement>;
  readonly onPointerCancel: PointerEventHandler<HTMLElement>;
  readonly onLostPointerCapture: PointerEventHandler<HTMLElement>;
}

export interface TouchControlsController {
  readonly movement: JoystickState | null;
  readonly shield: JoystickState | null;
  readonly movementVectorRef: RefObject<MovementInput>;
  readonly shieldAimRef: RefObject<MovementInput>;
  readonly movementKnobRef: RefObject<HTMLDivElement | null>;
  readonly shieldKnobRef: RefObject<HTMLDivElement | null>;
  readonly movementPointerIdRef: RefObject<number | null>;
  readonly shieldPointerIdRef: RefObject<number | null>;
  readonly pointerHandlers: TouchPointerHandlers;
}

export const SHIELD_JOYSTICK_RADIUS = 48;

export function useTouchControls(
  enabled: boolean,
  paused: boolean,
  shieldAvailable: boolean,
  sourceRef: RefObject<ShieldSource>,
  onShieldRelease: () => void,
): TouchControlsController {
  const [movement, setMovement] = useState<JoystickState | null>(null);
  const [shield, setShield] = useState<JoystickState | null>(null);
  const movementRef = useRef<JoystickState | null>(null);
  const shieldRef = useRef<JoystickState | null>(null);
  const movementVectorRef = useRef<MovementInput>({ x: 0, y: 0 });
  const shieldAimRef = useRef<MovementInput>({ x: 0, y: 0 });
  const movementKnobRef = useRef<HTMLDivElement>(null);
  const shieldKnobRef = useRef<HTMLDivElement>(null);
  const movementPointerIdRef = useRef<number | null>(null);
  const shieldPointerIdRef = useRef<number | null>(null);

  const releasePointerCapture = useCallback((element: HTMLElement, pointerId: number) => {
    const hasPointerCapture = (element as Partial<HTMLElement>).hasPointerCapture;

    if (typeof hasPointerCapture === 'function' && hasPointerCapture.call(element, pointerId)) {
      const release = (element as Partial<HTMLElement>).releasePointerCapture;

      if (typeof release === 'function') {
        release.call(element, pointerId);
      }
    }
  }, []);

  const release = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      const activeMovement = movementRef.current;
      const activeShield = shieldRef.current;

      if (activeMovement?.pointerId === event.pointerId) {
        movementRef.current = null;
        movementPointerIdRef.current = null;
        movementVectorRef.current = { x: 0, y: 0 };
        setMovement(null);
        releasePointerCapture(event.currentTarget, event.pointerId);
        return;
      }

      if (activeShield?.pointerId !== event.pointerId) {
        return;
      }

      shieldRef.current = null;
      shieldPointerIdRef.current = null;
      shieldAimRef.current = { x: 0, y: 0 };
      setShield(null);
      releasePointerCapture(event.currentTarget, event.pointerId);

      if (sourceRef.current === 'touch') {
        sourceRef.current = 'none';
        onShieldRelease();
      }
    },
    [onShieldRelease, releasePointerCapture, sourceRef],
  );

  const onPointerDown = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      if (!enabled || paused || event.pointerType === 'mouse') {
        return;
      }

      if (movementRef.current === null) {
        event.preventDefault();

        const rect = event.currentTarget.getBoundingClientRect();
        const next: JoystickState = {
          pointerId: event.pointerId,
          anchorX: event.clientX - rect.left,
          anchorY: event.clientY - rect.top,
        };

        movementRef.current = next;
        movementPointerIdRef.current = event.pointerId;
        movementVectorRef.current = { x: 0, y: 0 };
        setMovement(next);
        capturePointer(event.currentTarget, event.pointerId);
        return;
      }

      if (shieldRef.current !== null || !shieldAvailable || sourceRef.current !== 'none') {
        return;
      }

      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();
      const next: JoystickState = {
        pointerId: event.pointerId,
        anchorX: event.clientX - rect.left,
        anchorY: event.clientY - rect.top,
      };

      sourceRef.current = 'touch';
      shieldRef.current = next;
      shieldPointerIdRef.current = event.pointerId;
      shieldAimRef.current = { x: 0, y: 0 };
      setShield(next);
      capturePointer(event.currentTarget, event.pointerId);
    },
    [enabled, paused, shieldAvailable, sourceRef],
  );

  const onPointerMove = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      if (paused) {
        return;
      }

      const activeMovement = movementRef.current;

      if (activeMovement?.pointerId === event.pointerId) {
        const rect = event.currentTarget.getBoundingClientRect();
        const { vector, offset } = getJoystickVector(
          { x: activeMovement.anchorX, y: activeMovement.anchorY },
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
        );

        movementVectorRef.current = vector;
        writeKnob(movementKnobRef.current, offset);
        return;
      }

      const activeShield = shieldRef.current;

      if (activeShield?.pointerId !== event.pointerId) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const { vector, offset } = getJoystickVector(
        { x: activeShield.anchorX, y: activeShield.anchorY },
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        SHIELD_JOYSTICK_RADIUS,
      );

      shieldAimRef.current = vector;
      writeKnob(shieldKnobRef.current, offset);
    },
    [paused],
  );

  useEffect(() => {
    const clear = () => {
      const hadTouchSource = sourceRef.current === 'touch';

      movementRef.current = null;
      shieldRef.current = null;
      movementPointerIdRef.current = null;
      shieldPointerIdRef.current = null;
      movementVectorRef.current = { x: 0, y: 0 };
      shieldAimRef.current = { x: 0, y: 0 };

      if (hadTouchSource) {
        sourceRef.current = 'none';
        onShieldRelease();
      }

      const frame = requestAnimationFrame(() => {
        setMovement(null);
        setShield(null);
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    };

    if (!enabled || paused) {
      return clear();
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        clear();
      }
    };

    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      movementRef.current = null;
      shieldRef.current = null;
      movementPointerIdRef.current = null;
      shieldPointerIdRef.current = null;
      movementVectorRef.current = { x: 0, y: 0 };
      shieldAimRef.current = { x: 0, y: 0 };
    };
  }, [enabled, onShieldRelease, paused, sourceRef]);

  return {
    movement: enabled && !paused ? movement : null,
    shield: enabled && !paused ? shield : null,
    movementVectorRef,
    shieldAimRef,
    movementKnobRef,
    shieldKnobRef,
    movementPointerIdRef,
    shieldPointerIdRef,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
    },
  };
}

function writeKnob(
  element: HTMLDivElement | null,
  offset: { readonly x: number; readonly y: number },
) {
  if (element === null) {
    return;
  }

  element.style.transform = `translate(-50%, -50%) translate3d(${offset.x}px, ${offset.y}px, 0)`;
}

function capturePointer(element: HTMLElement, pointerId: number): void {
  const setPointerCapture = (element as Partial<HTMLElement>).setPointerCapture;

  if (typeof setPointerCapture !== 'function') {
    return;
  }

  try {
    setPointerCapture.call(element, pointerId);
  } catch {
    // Pointer capture is optional; the joystick still works while the pointer stays over the board.
  }
}
