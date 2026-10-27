import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useKeyboardInput } from './use-keyboard-input';

describe('useKeyboardInput', () => {
  it('maps WASD and arrow keys to a direction', () => {
    const { result } = renderHook(() => useKeyboardInput(true));

    fireEvent.keyDown(window, { code: 'KeyD' });
    expect(result.current.current).toEqual({ x: 1, y: 0 });

    fireEvent.keyDown(window, { code: 'KeyW' });
    expect(result.current.current).toEqual({ x: 1, y: -1 });

    fireEvent.keyUp(window, { code: 'KeyW' });
    expect(result.current.current).toEqual({ x: 1, y: 0 });

    fireEvent.keyUp(window, { code: 'KeyD' });
    expect(result.current.current).toEqual({ x: 0, y: 0 });

    fireEvent.keyDown(window, { code: 'ArrowLeft' });
    expect(result.current.current).toEqual({ x: -1, y: 0 });

    fireEvent.keyUp(window, { code: 'ArrowLeft' });
    expect(result.current.current).toEqual({ x: 0, y: 0 });
  });

  it('cancels opposite keys', () => {
    const { result } = renderHook(() => useKeyboardInput(true));

    fireEvent.keyDown(window, { code: 'KeyA' });
    fireEvent.keyDown(window, { code: 'KeyD' });
    fireEvent.keyDown(window, { code: 'KeyW' });
    fireEvent.keyDown(window, { code: 'KeyS' });

    expect(result.current.current).toEqual({ x: 0, y: 0 });
  });

  it('clears input on blur', () => {
    const { result } = renderHook(() => useKeyboardInput(true));

    fireEvent.keyDown(window, { code: 'KeyD' });
    expect(result.current.current).toEqual({ x: 1, y: 0 });

    fireEvent.blur(window);
    expect(result.current.current).toEqual({ x: 0, y: 0 });
  });

  it('does nothing while disabled', () => {
    const { result } = renderHook(() => useKeyboardInput(false));

    fireEvent.keyDown(window, { code: 'KeyD' });

    expect(result.current.current).toEqual({ x: 0, y: 0 });
  });

  it('clears movement and ignores keys while paused', () => {
    const { result, rerender } = renderHook(
      ({ paused }: { readonly paused: boolean }) => useKeyboardInput(true, paused),
      { initialProps: { paused: false } },
    );

    fireEvent.keyDown(window, { code: 'KeyD' });
    expect(result.current.current).toEqual({ x: 1, y: 0 });

    rerender({ paused: true });

    expect(result.current.current).toEqual({ x: 0, y: 0 });

    fireEvent.keyDown(window, { code: 'KeyD' });

    expect(result.current.current).toEqual({ x: 0, y: 0 });

    rerender({ paused: false });
    fireEvent.keyDown(window, { code: 'KeyD' });

    expect(result.current.current).toEqual({ x: 1, y: 0 });
  });

  it('ignores movement keys combined with browser modifiers', () => {
    const { result } = renderHook(() => useKeyboardInput(true));

    fireEvent.keyDown(window, { code: 'KeyD', metaKey: true });

    expect(result.current.current).toEqual({ x: 0, y: 0 });
  });
});
