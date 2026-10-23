import type { ReactNode, RefObject } from 'react';

interface PlayerContainerProps {
  readonly arenaRef: RefObject<HTMLDivElement | null>;
  readonly size: number;
  readonly children: ReactNode;
}

export function PlayerContainer({ arenaRef, size, children }: PlayerContainerProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-cyan/60 glow-arena"
      style={{ width: size, height: size }}
    >
      <div ref={arenaRef} className="relative h-full w-full">
        {children}
      </div>
    </div>
  );
}
