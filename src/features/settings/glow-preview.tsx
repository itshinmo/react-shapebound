import { PLAYER_BASE_STATS, PLAYER_CONTAINER_SIZE } from '@/game/player';

import type { CSSProperties } from 'react';

const PREVIEW_SCALE = 0.5;
const PREVIEW_CONTAINER_SIZE = PLAYER_CONTAINER_SIZE * PREVIEW_SCALE;
const PREVIEW_PLAYER_SIZE = PLAYER_BASE_STATS.size * PREVIEW_SCALE;

interface GlowPreviewProps {
  readonly intensity: number;
}

export function GlowPreview({ intensity }: GlowPreviewProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto [--glow-scale:0.5]"
      style={
        {
          width: PREVIEW_CONTAINER_SIZE,
          height: PREVIEW_CONTAINER_SIZE,
          '--glow-intensity': String(intensity),
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 bg-void bg-grid opacity-60" />
      <div className="relative flex h-full w-full items-center justify-center border border-cyan/60 glow-arena">
        <div
          className="bg-acid glow-player"
          style={{ width: PREVIEW_PLAYER_SIZE, height: PREVIEW_PLAYER_SIZE }}
        />
      </div>
    </div>
  );
}
