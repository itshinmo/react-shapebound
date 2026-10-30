import { act, fireEvent, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useMouseShield } from './use-mouse-shield';

import type { ShieldSource } from './shield-input';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

interface HarnessProps {
  readonly enabled: boolean;
  readonly blocked: boolean;
  readonly source?: ShieldSource;
  readonly onEngage: () => void;
  readonly onRelease: () => void;
}

function useHarness({ enabled, blocked, source = 'none', onEngage, onRelease }: HarnessProps) {
  const sourceRef = useRef<ShieldSource>(source);

  return {
    sourceRef,
    mouse: useMouseShield(enabled, blocked, sourceRef, onEngage, onRelease),
  };
}

function createPointerEvent(
  overrides: Readonly<Record<string, unknown>> = {},
): ReactPointerEvent<HTMLElement> {
  return {
    pointerType: 'mouse',
    button: 2,
    clientX: 120,
    clientY: 80,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as ReactPointerEvent<HTMLElement>;
}

function defaultProps(overrides: Partial<HarnessProps> = {}): HarnessProps {
  return {
    enabled: true,
    blocked: false,
    onEngage: vi.fn(),
    onRelease: vi.fn(),
    ...overrides,
  };
}

describe('useMouseShield', () => {
  it('engages on a right press, tracks pointer moves, and releases on right button up', () => {
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.mouse.pointerHandlers.onPointerDown(
        createPointerEvent({ clientX: 240, clientY: 160 }),
      );
    });

    expect(result.current.mouse.engagedRef.current).toBe(true);
    expect(result.current.sourceRef.current).toBe('mouse');
    expect(result.current.mouse.positionRef.current).toEqual({ x: 240, y: 160 });
    expect(props.onEngage).toHaveBeenCalledTimes(1);

    fireEvent.pointerMove(window, { pointerType: 'mouse', clientX: 300, clientY: 200 });

    expect(result.current.mouse.positionRef.current).toEqual({ x: 300, y: 200 });

    fireEvent.pointerUp(window, { pointerType: 'mouse', button: 2 });

    expect(result.current.mouse.engagedRef.current).toBe(false);
    expect(result.current.sourceRef.current).toBe('none');
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('ignores left presses and touch pointers', () => {
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.mouse.pointerHandlers.onPointerDown(createPointerEvent({ button: 0 }));
      result.current.mouse.pointerHandlers.onPointerDown(
        createPointerEvent({ pointerType: 'touch', button: 0 }),
      );
    });

    expect(result.current.mouse.engagedRef.current).toBe(false);
    expect(result.current.sourceRef.current).toBe('none');
  });

  it('does not preempt a touch shield source', () => {
    const props = defaultProps({ source: 'touch' });
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.mouse.pointerHandlers.onPointerDown(createPointerEvent());
    });

    expect(result.current.mouse.engagedRef.current).toBe(false);
    expect(result.current.sourceRef.current).toBe('touch');
  });

  it('releases on pointer cancel', () => {
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.mouse.pointerHandlers.onPointerDown(createPointerEvent());
    });

    fireEvent.pointerCancel(window, { pointerType: 'mouse' });

    expect(result.current.mouse.engagedRef.current).toBe(false);
    expect(result.current.sourceRef.current).toBe('none');
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('releases when the document is hidden', () => {
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);

    act(() => {
      result.current.mouse.pointerHandlers.onPointerDown(createPointerEvent());
    });

    fireEvent(document, new Event('visibilitychange'));

    expect(result.current.mouse.engagedRef.current).toBe(false);
    expect(result.current.sourceRef.current).toBe('none');
    expect(props.onRelease).toHaveBeenCalledTimes(1);

    hidden.mockRestore();
  });

  it('releases on window blur', () => {
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));

    act(() => {
      result.current.mouse.pointerHandlers.onPointerDown(createPointerEvent());
    });

    fireEvent.blur(window);

    expect(result.current.mouse.engagedRef.current).toBe(false);
    expect(result.current.sourceRef.current).toBe('none');
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('clears and ignores input while blocked', () => {
    const props = defaultProps();
    const { result, rerender } = renderHook((next: HarnessProps) => useHarness(next), {
      initialProps: props,
    });

    act(() => {
      result.current.mouse.pointerHandlers.onPointerDown(createPointerEvent());
    });

    expect(result.current.mouse.engagedRef.current).toBe(true);

    rerender({ ...props, blocked: true });

    expect(result.current.mouse.engagedRef.current).toBe(false);
    expect(result.current.sourceRef.current).toBe('none');
    expect(props.onRelease).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.mouse.pointerHandlers.onPointerDown(createPointerEvent());
    });

    expect(result.current.mouse.engagedRef.current).toBe(false);
  });

  it('prevents the play-surface context menu', () => {
    const props = defaultProps();
    const { result } = renderHook(() => useHarness(props));
    const preventDefault = vi.fn();

    result.current.mouse.pointerHandlers.onContextMenu({
      preventDefault,
    } as unknown as ReactMouseEvent<HTMLElement>);

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
