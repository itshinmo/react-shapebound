import type { RefObject } from 'react';

interface PlayerSquareProps {
  readonly playerRef: RefObject<HTMLDivElement | null>;
  readonly size: number;
}

export function PlayerSquare({ playerRef, size }: PlayerSquareProps) {
  return (
    <div
      ref={playerRef}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 bg-acid shadow-glow-acid will-change-transform"
      style={{ width: size, height: size }}
    />
  );
}
