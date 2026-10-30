import { useEffect, useRef } from 'react';

import type { ShieldSource } from './shield-input';
import type { MouseEventHandler, PointerEventHandler, RefObject } from 'react';

export interface MouseShieldPosition {
  readonly x: number;
  readonly y: number;
}

export interface MouseShieldController {
  readonly engagedRef: RefObject<boolean>;
  readonly positionRef: RefObject<MouseShieldPosition>;
  readonly pointerHandlers: {
    readonly onPointerDown: PointerEventHandler<HTMLElement>;
    readonly onContextMenu: MouseEventHandler<HTMLElement>;
  };
}

export function useMouseShield(
  enabled: boolean,
  blocked: boolean,
  sourceRef: RefObject<ShieldSource>,
  onEngage: () => void,
  onRelease: () => void,
): MouseShieldController {
  const engagedRef = useRef(false);
  const positionRef = useRef<MouseShieldPosition>({ x: 0, y: 0 });

  useEffect(() => {
    const clear = () => {
      const wasMouse = sourceRef.current === 'mouse';

      engagedRef.current = false;

      if (wasMouse) {
        sourceRef.current = 'none';
        onRelease();
      }
    };

    if (!enabled || blocked) {
      clear();
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!engagedRef.current || event.pointerType !== 'mouse') {
        return;
      }

      positionRef.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!engagedRef.current || event.pointerType !== 'mouse' || event.button !== 2) {
        return;
      }

      clear();
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (!engagedRef.current || event.pointerType !== 'mouse') {
        return;
      }

      clear();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clear();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [blocked, enabled, onRelease, sourceRef]);

  const onPointerDown: PointerEventHandler<HTMLElement> = (event) => {
    if (!enabled || blocked) {
      return;
    }

    if (event.pointerType !== 'mouse' || event.button !== 2) {
      return;
    }

    if (sourceRef.current === 'touch') {
      return;
    }

    event.preventDefault();
    sourceRef.current = 'mouse';
    engagedRef.current = true;
    positionRef.current = { x: event.clientX, y: event.clientY };
    onEngage();
  };

  const onContextMenu: MouseEventHandler<HTMLElement> = (event) => {
    event.preventDefault();
  };

  return {
    engagedRef,
    positionRef,
    pointerHandlers: {
      onPointerDown,
      onContextMenu,
    },
  };
}
