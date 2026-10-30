import type { ReactNode, RefObject } from 'react';

interface PlayerContainerProps {
  readonly arenaRef: RefObject<HTMLDivElement | null>;
  readonly size: number;
  readonly children: ReactNode;
}

export function PlayerContainer({ arenaRef, size, children }: PlayerContainerProps) {
  const dimension = `min(${size}px, 100cqw, 100cqh)`;

  return (
    <div
      aria-hidden="true"
      data-testid="player-container"
      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-cyan/60 glow-arena"
      style={{ width: dimension, height: dimension }}
    >
      <div ref={arenaRef} data-testid="arena" className="relative h-full w-full">
        {children}
      </div>
    </div>
  );
}
