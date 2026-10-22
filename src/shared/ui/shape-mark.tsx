import { cx } from '@/shared/lib/cx';

interface ShapeMarkProps {
  readonly className?: string;
}

export function ShapeMark({ className }: ShapeMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cx('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M32 4 58 18v28L32 60 6 46V18L32 4Z" />
      <path d="M32 4v28l26 14M32 32 6 46M32 32l26-14M32 32 6 18" opacity="0.55" />
      <path d="M18 24l14-8 14 8-14 8-14-8Z" fill="currentColor" fillOpacity="0.16" />
      <path d="M32 32v28M6 46l26-14 26 14" opacity="0.8" />
    </svg>
  );
}
