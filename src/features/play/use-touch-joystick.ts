import { useCallback, useEffect, useRef, useState } from 'react';

import type { MovementInput } from '@/game/player';

import { getJoystickVector } from './joystick-vector';

import type { PointerEventHandler, RefObject } from 'react';

export interface JoystickState {
  readonly pointerId: number;
  readonly anchorX: number;
  readonly anchorY: number;
}

interface TouchJoystickPointerHandlers {
  readonly onPointerDown: PointerEventHandler<HTMLElement>;
  readonly onPointerMove: PointerEventHandler<HTMLElement>;
  readonly onPointerUp: PointerEventHandler<HTMLElement>;
  readonly onPointerCancel: PointerEventHandler<HTMLElement>;
  readonly onLostPointerCapture: PointerEventHandler<HTMLElement>;
}

export interface TouchJoystickController {
  readonly state: JoystickState | null;
  readonly activeRef: RefObject<JoystickState | null>;
  readonly vectorRef: RefObject<MovementInput>;
  readonly knobRef: RefObject<HTMLDivElement | null>;
  readonly pointerHandlers: TouchJoystickPointerHandlers;
}

export function useTouchJoystick(enabled: boolean, paused = false): TouchJoystickController {
  const [state, setState] = useState<JoystickState | null>(null);
  const activeRef = useRef<JoystickState | null>(null);
  const vectorRef = useRef<MovementInput>({ x: 0, y: 0 });
  const knobRef = useRef<HTMLDivElement>(null);

  const release = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const active = activeRef.current;

    if (active === null) {
      return;
    }

    if (active.pointerId !== event.pointerId) {
      return;
    }

    activeRef.current = null;
    vectorRef.current = { x: 0, y: 0 };
    setState(null);

    const element = event.currentTarget;
    const hasPointerCapture = (element as Partial<HTMLElement>).hasPointerCapture;

    if (
      typeof hasPointerCapture === 'function' &&
      hasPointerCapture.call(element, event.pointerId)
    ) {
      const releasePointerCapture = (element as Partial<HTMLElement>).releasePointerCapture;

      if (typeof releasePointerCapture === 'function') {
        releasePointerCapture.call(element, event.pointerId);
      }
    }
  }, []);

  const onPointerDown = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      if (!enabled || paused || event.pointerType === 'mouse' || activeRef.current !== null) {
        return;
      }

      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();
      const nextState: JoystickState = {
        pointerId: event.pointerId,
        anchorX: event.clientX - rect.left,
        anchorY: event.clientY - rect.top,
      };

      activeRef.current = nextState;
      vectorRef.current = { x: 0, y: 0 };
      setState(nextState);

      const element = event.currentTarget;
      const setPointerCapture = (element as Partial<HTMLElement>).setPointerCapture;

      if (typeof setPointerCapture === 'function') {
        try {
          setPointerCapture.call(element, event.pointerId);
        } catch {
          // Pointer capture is optional; the joystick still works while the pointer stays over the board.
        }
      }
    },
    [enabled, paused],
  );

  const onPointerMove = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      if (paused) {
        return;
      }

      const active = activeRef.current;

      if (active === null) {
        return;
      }

      if (active.pointerId !== event.pointerId) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const { vector, offset } = getJoystickVector(
        { x: active.anchorX, y: active.anchorY },
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
      );

      vectorRef.current = vector;

      if (knobRef.current !== null) {
        knobRef.current.style.transform = `translate(-50%, -50%) translate3d(${offset.x}px, ${offset.y}px, 0)`;
      }
    },
    [paused],
  );

  useEffect(() => {
    if (!enabled || paused) {
      activeRef.current = null;
      vectorRef.current = { x: 0, y: 0 };

      const frame = requestAnimationFrame(() => {
        setState(null);
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }

    const clear = () => {
      activeRef.current = null;
      vectorRef.current = { x: 0, y: 0 };
      setState(null);
    };

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
      activeRef.current = null;
      vectorRef.current = { x: 0, y: 0 };
    };
  }, [enabled, paused]);

  return {
    state: enabled && !paused ? state : null,
    activeRef,
    vectorRef,
    knobRef,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
    },
  };
}
