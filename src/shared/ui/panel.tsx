import { cx } from '@/shared/lib/cx';

import type { HTMLAttributes } from 'react';

export type PanelTone = 'default' | 'acid' | 'cyan' | 'red';

const tones: Record<PanelTone, string> = {
  default: '[--clip-border:var(--color-line)]',
  acid: '[--clip-border:var(--color-acid)]',
  cyan: '[--clip-border:var(--color-cyan)]',
  red: '[--clip-border:var(--color-red)]',
};

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: PanelTone;
}

export function Panel({ tone = 'default', className, children, ...props }: PanelProps) {
  return (
    <div
      className={cx(
        'clip-border relative shadow-[inset_0_1px_0_rgb(245_245_245_/_0.04)] [--clip-fill:var(--color-void)] clip-corner',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
