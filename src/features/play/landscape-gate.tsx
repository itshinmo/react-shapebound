import { useLandscape } from './use-landscape';

import type { ReactNode } from 'react';

interface LandscapeGateProps {
  readonly children: ReactNode;
}

export function LandscapeGate({ children }: LandscapeGateProps) {
  const isLandscape = useLandscape();

  if (isLandscape) {
    return children;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-void px-6 py-10 text-ink"
    >
      <div className="w-full max-w-lg text-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 128 72"
          className="mx-auto h-16 w-28 text-cyan sm:h-20 sm:w-36"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="28" y="10" width="72" height="52" />
          <line x1="56" y1="56" x2="72" y2="56" />
          <path d="M12 36H4m120 0h-8" />
          <path d="M98 4l6 6-6 6" />
        </svg>

        <p className="mt-8 font-mono text-[0.62rem] tracking-[0.24em] text-cyan uppercase">
          /// ORIENTATION_LOCK
        </p>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,8vw,3rem)] font-bold tracking-[0.02em] uppercase">
          Rotate to landscape
        </h1>
        <p className="mt-4 font-body text-base leading-snug text-muted sm:text-lg">
          Shapebound is played horizontally. Rotate your device or widen the window to continue.
        </p>
      </div>
    </div>
  );
}
