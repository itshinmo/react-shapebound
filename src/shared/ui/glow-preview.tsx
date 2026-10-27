import { cx } from '@/shared/lib/cx';

import type { CSSProperties } from 'react';

const PREVIEW_ARENA_SIZE = 160;
const PREVIEW_PLAYER_SIZE = 32;
const PREVIEW_TIMELINE_WIDTH = 72;
const PREVIEW_BOSS_WIDTH = 40;

const TRACK_NODES: readonly { readonly left: string; readonly color: string }[] = [
  { left: '0%', color: 'bg-boss-purple text-boss-purple' },
  { left: '50%', color: 'bg-boss-green text-boss-green' },
  { left: '100%', color: 'bg-boss-orange text-boss-orange' },
];

interface GlowPreviewProps {
  readonly intensity: number;
}

export function GlowPreview({ intensity }: GlowPreviewProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="glow-preview"
      className="pointer-events-none relative mx-auto w-40 [--glow-scale:0.5]"
      style={
        {
          '--glow-intensity': String(intensity),
        } as CSSProperties
      }
    >
      <div
        className="relative flex items-center justify-center border border-cyan/60 bg-void bg-grid glow-arena"
        style={{ width: PREVIEW_ARENA_SIZE, height: PREVIEW_ARENA_SIZE }}
      >
        <div
          data-testid="glow-preview-enemy"
          className="absolute top-6 right-3 size-4 border border-ink/25 bg-red text-red glow-enemy"
        />

        <div
          data-testid="glow-preview-warning"
          className="absolute top-14 left-5 h-16 w-1 origin-center rotate-[30deg] border border-orange/60 bg-warning-lane text-orange glow-warning"
        />

        <div
          data-testid="glow-preview-player"
          className="bg-acid glow-player"
          style={{ width: PREVIEW_PLAYER_SIZE, height: PREVIEW_PLAYER_SIZE }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div
          data-testid="glow-preview-timeline"
          className="relative h-4"
          style={{ width: PREVIEW_TIMELINE_WIDTH }}
        >
          <div
            data-testid="glow-preview-track"
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-track text-track glow-track"
          />
          {TRACK_NODES.map((node) => (
            <span
              key={node.left}
              className={cx(
                'absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 glow-track clip-diamond',
                node.color,
              )}
              style={{ left: node.left }}
            />
          ))}
        </div>

        <div
          data-testid="glow-preview-boss"
          className="relative h-2.5 text-boss-purple glow-hud"
          style={{ width: PREVIEW_BOSS_WIDTH }}
        >
          <div className="clip-border relative h-full w-full [--clip-border:currentColor] [--clip-fill:var(--color-void)] clip-corner-sm">
            <span className="absolute top-1/2 left-1 size-1 -translate-y-1/2 bg-boss-purple clip-diamond" />
          </div>
        </div>
      </div>
    </div>
  );
}
