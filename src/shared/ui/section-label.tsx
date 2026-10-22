import { cx } from '@/shared/lib/cx';

import type { ReactNode } from 'react';

type SectionLabelTone = 'cyan' | 'acid' | 'red';

const tones: Record<SectionLabelTone, string> = {
  cyan: 'text-cyan',
  acid: 'text-acid',
  red: 'text-red',
};

interface SectionLabelProps {
  readonly children: ReactNode;
  readonly tone?: SectionLabelTone;
  readonly className?: string;
}

export function SectionLabel({ children, tone = 'cyan', className }: SectionLabelProps) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 font-mono text-[0.62rem] tracking-[0.22em] uppercase',
        tones[tone],
        className,
      )}
    >
      <span aria-hidden="true">///</span>
      <span>{children}</span>
      <span aria-hidden="true" className="h-px min-w-6 flex-1 bg-current opacity-30" />
      <span aria-hidden="true" className="h-1.5 w-6 bg-dots opacity-50" />
    </div>
  );
}
