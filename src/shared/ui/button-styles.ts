import { cx } from '@/shared/lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
export type ButtonSize = 'md' | 'lg';

const base =
  'clip-button group relative inline-flex items-center justify-center gap-3 border font-display text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-snap disabled:pointer-events-none disabled:opacity-40';

const variants: Record<ButtonVariant, string> = {
  primary:
    'border-acid bg-acid text-ink-inverse shadow-glow-acid hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-void active:translate-y-0',
  secondary:
    'border-acid bg-void/80 text-acid hover:border-cyan hover:text-cyan hover:shadow-glow-cyan',
  ghost: 'border-transparent bg-transparent text-muted hover:text-ink',
  danger: 'border-red bg-red/10 text-red hover:bg-red hover:text-ink-inverse',
  inverse:
    'border-ink-inverse bg-ink-inverse text-acid hover:border-ink-inverse hover:bg-cyan hover:text-ink-inverse',
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
