import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useTouchControls } from './use-touch-controls';

import type { ShieldSource } from './shield-input';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface HarnessProps {
  readonly enabled: boolean;
  readonly paused: boolean;
  readonly shieldAvailable: boolean;
  readonly source?: ShieldSource;
  readonly onShieldRelease: () => void;
}

function useHarness({
  enabled,
  paused,
  shieldAvailable,
  source = 'none',
  onShieldRelease,
}: HarnessProps) {
  const sourceRef = useRef<ShieldSource>(source);

  return {
    sourceRef,
    controls: useTouchControls(enabled, paused, shieldAvailable, sourceRef, onShieldRelease),
  };
}

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

function defaultProps(overrides: Partial<HarnessProps> = {}): HarnessProps {
  return {
    enabled: true,
    paused: false,
    shieldAvailable: true,
    onShieldRelease: vi.fn(),
    ...overrides,
  };
}

describe('useTouchControls', () => {
  it('assigns the first touch to movement and the second to a shield joystick', () => {
    const board = createBoard();
    const movementKnob = document.createElement('div');
    const shieldKnob = document.createElement('div');
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    expect(result.current.controls.movement).toEqual({
      pointerId: 1,
      anchorX: 100,
      anchorY: 100,
    });
    expect(result.current.controls.shield).toEqual({
      pointerId: 2,
      anchorX: 300,
      anchorY: 300,
    });
    expect(result.current.sourceRef.current).toBe('touch');

    result.current.controls.movementKnobRef.current = movementKnob;
    result.current.controls.shieldKnobRef.current = shieldKnob;

    act(() => {
      result.current.controls.pointerHandlers.onPointerMove(
        createPointerEvent(board, { clientX: 156, clientY: 100 }),
      );
      result.current.controls.pointerHandlers.onPointerMove(
        createPointerEvent(board, { pointerId: 2, clientX: 348, clientY: 300 }),
      );
    });

    expect(result.current.controls.movementVectorRef.current).toEqual({ x: 1, y: 0 });
    expect(result.current.controls.shieldAimRef.current.x).toBeCloseTo(1);
    expect(result.current.controls.shieldAimRef.current.y).toBeCloseTo(0);
    expect(movementKnob.style.transform).toBe('translate(-50%, -50%) translate3d(56px, 0px, 0)');
    expect(shieldKnob.style.transform).toBe('translate(-50%, -50%) translate3d(48px, 0px, 0)');
  });

  it('keeps the shield aim at zero inside the joystick dead zone', () => {
    const board = createBoard();
    const shieldKnob = document.createElement('div');
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    result.current.controls.shieldKnobRef.current = shieldKnob;

    act(() => {
      result.current.controls.pointerHandlers.onPointerMove(
        createPointerEvent(board, { pointerId: 2, clientX: 306, clientY: 304 }),
      );
    });

    expect(result.current.controls.shieldAimRef.current).toEqual({ x: 0, y: 0 });
    expect(shieldKnob.style.transform).toBe('translate(-50%, -50%) translate3d(0px, 0px, 0)');
  });

  it('ignores a second touch when shield charges are unavailable', () => {
    const board = createBoard();
    const props = defaultProps({ shieldAvailable: false });
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    expect(result.current.controls.shield).toBeNull();
    expect(result.current.sourceRef.current).toBe('none');
  });

  it('ignores a third pointer', () => {
    const board = createBoard();
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 3, clientX: 500, clientY: 500 }),
      );
    });

    expect(result.current.controls.movement?.pointerId).toBe(1);
    expect(result.current.controls.shield?.pointerId).toBe(2);
    expect(result.current.controls.movementVectorRef.current).toEqual({ x: 0, y: 0 });
  });

  it('keeps the shield latched when movement lifts and assigns the next touch to movement', () => {
    const board = createBoard();
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    act(() => {
      result.current.controls.pointerHandlers.onPointerUp(
        createPointerEvent(board, { pointerId: 1, clientX: 100, clientY: 100 }),
      );
    });

    expect(result.current.controls.movement).toBeNull();
    expect(result.current.controls.shield?.pointerId).toBe(2);

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 3, clientX: 200, clientY: 200 }),
      );
    });

    expect(result.current.controls.movement?.pointerId).toBe(3);
    expect(result.current.controls.shield?.pointerId).toBe(2);
  });

  it('treats pointer cancel and lost capture as a shield lift', () => {
    const board = createBoard();
    const onShieldRelease = vi.fn();
    const props = defaultProps({ onShieldRelease });
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    act(() => {
      result.current.controls.pointerHandlers.onPointerCancel(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    expect(result.current.controls.shield).toBeNull();
    expect(result.current.controls.movement?.pointerId).toBe(1);
    expect(result.current.sourceRef.current).toBe('none');
    expect(onShieldRelease).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    act(() => {
      result.current.controls.pointerHandlers.onLostPointerCapture(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    expect(result.current.controls.shield).toBeNull();
    expect(onShieldRelease).toHaveBeenCalledTimes(2);
  });

  it('clears the shield pointer and reports the release while movement continues', () => {
    const board = createBoard();
    const onShieldRelease = vi.fn();
    const props = defaultProps({ onShieldRelease });
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    act(() => {
      result.current.controls.pointerHandlers.onPointerUp(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    expect(result.current.controls.shield).toBeNull();
    expect(result.current.controls.movement?.pointerId).toBe(1);
    expect(result.current.controls.shieldAimRef.current).toEqual({ x: 0, y: 0 });
    expect(result.current.sourceRef.current).toBe('none');
    expect(onShieldRelease).toHaveBeenCalledTimes(1);
  });

  it('does not let a touch shield preempt a mouse shield source', () => {
    const board = createBoard();
    const props = defaultProps({ source: 'mouse' });
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    expect(result.current.controls.shield).toBeNull();
    expect(result.current.sourceRef.current).toBe('mouse');
  });

  it('ignores mouse pointers', () => {
    const board = createBoard();
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerType: 'mouse' }),
      );
    });

    expect(result.current.controls.movement).toBeNull();
    expect(result.current.controls.shield).toBeNull();
  });

  it('clears both roles and reports the shield when the document is hidden', async () => {
    const board = createBoard();
    const onShieldRelease = vi.fn();
    const props = defaultProps({ onShieldRelease });
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    fireEvent(document, new Event('visibilitychange'));

    expect(result.current.controls.movementPointerIdRef.current).toBeNull();
    expect(result.current.controls.shieldPointerIdRef.current).toBeNull();
    expect(result.current.sourceRef.current).toBe('none');
    expect(onShieldRelease).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.controls.movement).toBeNull();
      expect(result.current.controls.shield).toBeNull();
    });

    hidden.mockRestore();
  });

  it('clears both roles and reports the shield when paused', () => {
    const board = createBoard();
    const onShieldRelease = vi.fn();
    const props = defaultProps({ onShieldRelease });
    const { result, rerender } = renderHook((next: HarnessProps) => useHarness(next), {
      initialProps: props,
    });

    act(() => {
      result.current.controls.pointerHandlers.onPointerDown(createPointerEvent(board));
      result.current.controls.pointerHandlers.onPointerDown(
        createPointerEvent(board, { pointerId: 2, clientX: 300, clientY: 300 }),
      );
    });

    expect(result.current.controls.movement).not.toBeNull();
    expect(result.current.controls.shield).not.toBeNull();

    rerender({ ...props, paused: true });

    expect(result.current.controls.movement).toBeNull();
    expect(result.current.controls.shield).toBeNull();
    expect(result.current.controls.movementPointerIdRef.current).toBeNull();
    expect(result.current.controls.shieldPointerIdRef.current).toBeNull();
    expect(result.current.sourceRef.current).toBe('none');
    expect(onShieldRelease).toHaveBeenCalledTimes(1);
  });
});
