import { cx } from '@/shared/lib/cx';

import type { RefObject } from 'react';

interface PlayerSquareProps {
  readonly playerRef: RefObject<HTMLDivElement | null>;
  readonly size: number;
  readonly maxReflectCharges: number;
  readonly charges: number;
  readonly maxBarrier: number;
  readonly barrier: number;
  readonly ringProgressRef: RefObject<SVGCircleElement | null>;
  readonly barrierHit: boolean;
}

export function PlayerSquare({
  playerRef,
  size,
  maxReflectCharges,
  charges,
  maxBarrier,
  barrier,
  ringProgressRef,
  barrierHit,
}: PlayerSquareProps) {
  const ringInset = 4;
  const ringDiameter = Math.max(0, size - ringInset * 2);
  const ringRadius = Math.max(0, ringDiameter / 2 - 1);
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <div
      ref={playerRef}
      aria-hidden="true"
      data-testid="player-square"
      data-barrier-hit={barrierHit ? 'true' : undefined}
      className={cx(
        'pointer-events-none absolute top-0 left-0 bg-acid glow-player will-change-transform',
        barrierHit && 'outline-2 outline-ink',
      )}
      style={{ width: size, height: size }}
    >
      {maxReflectCharges > 0 ? (
        <>
          <svg
            aria-hidden="true"
            data-testid="charge-ring"
            viewBox={`0 0 ${ringDiameter} ${ringDiameter}`}
            className="pointer-events-none absolute"
            style={{ inset: ringInset, width: ringDiameter, height: ringDiameter }}
          >
            <circle
              data-testid="charge-ring-track"
              cx={ringDiameter / 2}
              cy={ringDiameter / 2}
              r={ringRadius}
              fill="none"
              strokeWidth={2}
              className="stroke-ink-inverse/25"
            />
            <circle
              ref={ringProgressRef}
              data-testid="charge-ring-progress"
              cx={ringDiameter / 2}
              cy={ringDiameter / 2}
              r={ringRadius}
              fill="none"
              strokeWidth={2}
              strokeDasharray={`${ringCircumference} ${ringCircumference}`}
              strokeDashoffset={0}
              transform={`rotate(-90 ${ringDiameter / 2} ${ringDiameter / 2})`}
              className="stroke-ink-inverse"
            />
          </svg>
          <span
            data-testid="charge-count"
            className="pointer-events-none absolute inset-0 grid place-items-center font-mono leading-none font-medium text-ink-inverse tabular-nums"
            style={{ fontSize: `clamp(0.625rem, ${size * 0.2}px, 0.75rem)` }}
          >
            {charges}
          </span>
        </>
      ) : null}

      {maxBarrier > 0 ? (
        <div
          data-testid="barrier-notches"
          className="pointer-events-none absolute top-0 left-1/2 flex -translate-x-1/2 gap-0.5"
        >
          {Array.from({ length: maxBarrier }, (_, index) => {
            const filled = index < barrier;

            return (
              <span
                key={index}
                data-testid="barrier-notch"
                data-filled={filled ? 'true' : 'false'}
                className={cx(filled ? 'bg-ink-inverse' : 'border border-ink-inverse/40')}
                style={{ width: 5, height: 2 }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
