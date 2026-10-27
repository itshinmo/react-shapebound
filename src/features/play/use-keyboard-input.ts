import { useEffect, useRef } from 'react';

import type { MovementInput } from '@/game/player';

import type { RefObject } from 'react';

const MOVEMENT_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

export function useKeyboardInput(enabled: boolean, paused = false): RefObject<MovementInput> {
  const inputRef = useRef<MovementInput>({ x: 0, y: 0 });

  useEffect(() => {
    const clearInput = () => {
      inputRef.current = { x: 0, y: 0 };
    };

    if (!enabled || paused) {
      clearInput();
      return;
    }

    const pressed = new Set<string>();

    const sync = () => {
      const left = pressed.has('KeyA') || pressed.has('ArrowLeft');
      const right = pressed.has('KeyD') || pressed.has('ArrowRight');
      const up = pressed.has('KeyW') || pressed.has('ArrowUp');
      const down = pressed.has('KeyS') || pressed.has('ArrowDown');

      inputRef.current = {
        x: Number(right) - Number(left),
        y: Number(down) - Number(up),
      };
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!MOVEMENT_CODES.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.code.startsWith('Arrow')) {
        event.preventDefault();
      }

      pressed.add(event.code);
      sync();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!MOVEMENT_CODES.has(event.code)) {
        return;
      }

      pressed.delete(event.code);
      sync();
    };

    const onBlur = () => {
      pressed.clear();
      clearInput();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        pressed.clear();
        clearInput();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      pressed.clear();
      clearInput();
    };
  }, [enabled, paused]);

  return inputRef;
}
