import { cx } from '@/shared/lib/cx';

import type { HTMLAttributes } from 'react';

export type PanelTone = 'default' | 'acid' | 'cyan' | 'red';

const tones: Record<PanelTone, string> = {
  default: 'border-line',
  acid: 'border-acid',
  cyan: 'border-cyan',
  red: 'border-red',
};

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: PanelTone;
}

export function Panel({ tone = 'default', className, children, ...props }: PanelProps) {
  return (
    <div
      className={cx(
        'relative border bg-void/90 shadow-[inset_0_1px_0_rgb(245_245_245_/_0.04)] backdrop-blur-sm clip-corner',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
