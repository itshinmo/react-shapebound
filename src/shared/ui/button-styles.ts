import { cx } from '@/shared/lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
export type ButtonSize = 'md' | 'lg';

const base =
  'clip-button group relative inline-flex items-center justify-center gap-3 font-display text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition-[background-color,color,box-shadow,transform] duration-150 ease-snap focus-visible:outline-none focus-visible:[--clip-border:var(--color-cyan)] focus-visible:[--clip-border-width:2px] active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-40';

const variants: Record<ButtonVariant, string> = {
  primary:
    'clip-border text-ink-inverse shadow-glow-acid [--clip-border:var(--color-acid)] [--clip-fill:var(--color-acid)] hover:-translate-y-0.5 hover:text-void hover:[--clip-border:var(--color-ink)] hover:[--clip-fill:var(--color-ink)]',
  secondary:
    'clip-border text-acid [--clip-border:var(--color-acid)] [--clip-fill:var(--color-void)] hover:text-cyan hover:shadow-glow-cyan hover:[--clip-border:var(--color-cyan)]',
  ghost: 'bg-transparent text-muted hover:text-ink focus-visible:bg-void/60 focus-visible:text-ink',
  danger:
    'clip-border text-ink-inverse [--clip-border:var(--color-red)] [--clip-fill:var(--color-red)] hover:-translate-y-0.5',
  inverse:
    'clip-border text-acid [--clip-border:var(--color-ink-inverse)] [--clip-fill:var(--color-ink-inverse)] hover:text-ink-inverse hover:[--clip-fill:var(--color-cyan)]',
};

const sizes: Record<ButtonSize, string> = {
  md: 'px-5 py-3',
  lg: 'px-7 py-4 text-[0.8rem]',
};

interface ButtonClassNameOptions {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string | undefined;
}

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonClassNameOptions = {}): string {
  return cx(base, variants[variant], sizes[size], className);
}
