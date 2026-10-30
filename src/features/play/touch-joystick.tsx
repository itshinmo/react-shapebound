import { cx } from '@/shared/lib/cx';

import type { JoystickState } from './use-touch-controls';
import type { RefObject } from 'react';

interface TouchJoystickProps {
  readonly variant: 'movement' | 'shield';
  readonly state: JoystickState | null;
  readonly knobRef: RefObject<HTMLDivElement | null>;
}

export function TouchJoystick({ variant, state, knobRef }: TouchJoystickProps) {
  if (state === null) {
    return null;
  }

  const isShield = variant === 'shield';

  return (
    <div
      aria-hidden="true"
      data-joystick={variant}
      data-testid={`${variant}-joystick`}
      className="pointer-events-none absolute inset-0 z-20"
    >
      <div
        className={cx(
          'absolute -translate-x-1/2 -translate-y-1/2 rounded-full',
          isShield
            ? 'size-24 border border-dashed border-cyan/50 bg-cyan/5'
            : 'size-28 border border-cyan/50 bg-cyan/10',
        )}
        style={{ left: state.anchorX, top: state.anchorY }}
      />
      <div
        ref={knobRef}
        className={cx(
          'absolute',
          isShield ? 'size-9' : 'h-11 w-11 rounded-full border border-cyan bg-cyan glow-joystick',
        )}
        style={{
          left: state.anchorX,
          top: state.anchorY,
          transform: 'translate(-50%, -50%) translate3d(0px, 0px, 0px)',
        }}
      >
        {isShield ? (
          <div className="pointer-events-none flex size-full rotate-45 items-center justify-center border border-cyan bg-cyan/20 glow-joystick">
            <span className="size-1.5 bg-cyan" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
