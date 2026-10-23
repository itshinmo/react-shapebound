import type { JoystickState } from './use-touch-joystick';
import type { RefObject } from 'react';

interface TouchJoystickProps {
  readonly state: JoystickState | null;
  readonly knobRef: RefObject<HTMLDivElement | null>;
}

export function TouchJoystick({ state, knobRef }: TouchJoystickProps) {
  if (state === null) {
    return null;
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      <div
        className="absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/50 bg-cyan/10"
        style={{ left: state.anchorX, top: state.anchorY }}
      />
      <div
        ref={knobRef}
        className="absolute h-11 w-11 rounded-full border border-cyan bg-cyan shadow-glow-cyan"
        style={{
          left: state.anchorX,
          top: state.anchorY,
          transform: 'translate(-50%, -50%) translate3d(0px, 0px, 0px)',
        }}
      />
    </div>
  );
}
