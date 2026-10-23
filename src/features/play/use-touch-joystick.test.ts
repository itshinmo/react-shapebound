import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTouchJoystick } from './use-touch-joystick';

import type { PointerEvent as ReactPointerEvent } from 'react';

function createBoard(): HTMLElement {
  const board = document.createElement('section');

  board.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

  return board;
}

function createPointerEvent(
  board: HTMLElement,
  overrides: Readonly<Record<string, unknown>> = {},
): ReactPointerEvent<HTMLElement> {
  return {
    pointerId: 1,
    pointerType: 'touch',
    clientX: 100,
    clientY: 100,
    currentTarget: board,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as ReactPointerEvent<HTMLElement>;
}

describe('useTouchJoystick', () => {
  it('anchors at the touch point, moves the knob, and hides on release', () => {
    const board = createBoard();
    const knob = document.createElement('div');
    const { result } = renderHook(() => useTouchJoystick(true));

    act(() => {
      result.current.pointerHandlers.onPointerDown(createPointerEvent(board));
    });

    expect(result.current.state).toEqual({
      pointerId: 1,
      anchorX: 100,
      anchorY: 100,
    });

    result.current.knobRef.current = knob;

    act(() => {
      result.current.pointerHandlers.onPointerMove(
        createPointerEvent(board, { clientX: 156, clientY: 100 }),
      );
    });

    expect(result.current.vectorRef.current.x).toBeCloseTo(1);
    expect(result.current.vectorRef.current.y).toBeCloseTo(0);
    expect(knob.style.transform).toBe('translate(-50%, -50%) translate3d(56px, 0px, 0)');

    act(() => {
      result.current.pointerHandlers.onPointerUp(createPointerEvent(board));
    });

    expect(result.current.state).toBeNull();
    expect(result.current.vectorRef.current).toEqual({ x: 0, y: 0 });
  });

  it('ignores mouse input', () => {
    const board = createBoard();
    const { result } = renderHook(() => useTouchJoystick(true));

    act(() => {
      result.current.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerType: 'mouse' }),
      );
    });

    expect(result.current.state).toBeNull();
  });

  it('ignores a second simultaneous touch', () => {
    const board = createBoard();
    const { result } = renderHook(() => useTouchJoystick(true));

    act(() => {
      result.current.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    expect(result.current.state?.pointerId).toBe(1);
    expect(result.current.state?.anchorX).toBe(100);
  });

  it('does not start while disabled', () => {
    const board = createBoard();
    const { result } = renderHook(() => useTouchJoystick(false));

    act(() => {
      result.current.pointerHandlers.onPointerDown(createPointerEvent(board));
    });

    expect(result.current.state).toBeNull();
  });
});
