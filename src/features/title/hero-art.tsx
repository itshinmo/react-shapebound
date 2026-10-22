import { cx } from '@/shared/lib/cx';

interface HeroArtProps {
  readonly className?: string;
}

export function HeroArt({ className }: HeroArtProps) {
  return (
    <svg
      viewBox="0 0 600 760"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cx('block', className)}
    >
      <defs>
        <linearGradient id="hero-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-red)" />
          <stop offset="1" stopColor="#7a001a" />
        </linearGradient>
        <linearGradient id="hero-cyan" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-cyan)" />
          <stop offset="1" stopColor="#00343a" />
        </linearGradient>
        <pattern id="hero-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M24 0H0V24"
            fill="none"
            stroke="var(--color-ink)"
            strokeOpacity="0.12"
            strokeWidth="1"
          />
        </pattern>
        <pattern id="hero-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--color-acid)" fillOpacity="0.35" />
        </pattern>
      </defs>

      <rect width="600" height="760" fill="var(--color-void)" />
      <rect width="600" height="760" fill="url(#hero-grid)" />

      <path d="M0 0h390L250 250H0Z" fill="url(#hero-red)" opacity="0.92" />
      <path d="M600 0v390L390 280V0Z" fill="url(#hero-cyan)" opacity="0.22" />
      <path d="M600 760H190L330 520h270Z" fill="var(--color-red)" opacity="0.7" />
      <path d="M0 760V410l190 130v220Z" fill="var(--color-cyan)" opacity="0.18" />

      <rect x="0" y="500" width="600" height="8" fill="var(--color-red)" opacity="0.7" />
      <rect x="0" y="516" width="380" height="2" fill="var(--color-cyan)" opacity="0.55" />
      <rect x="180" y="560" width="420" height="5" fill="var(--color-acid)" opacity="0.35" />
      <rect x="0" y="0" width="190" height="4" fill="var(--color-cyan)" opacity="0.55" />

      <path
        d="M300 70 520 205v270L300 610 80 475V205Z"
        fill="none"
        stroke="var(--color-acid)"
        strokeWidth="2"
        opacity="0.95"
      />
      <path
        d="M300 70v270l220 135M300 340 80 475M300 340l220-135M300 340 80 205"
        fill="none"
        stroke="var(--color-cyan)"
        strokeWidth="1.2"
        opacity="0.7"
      />
      <path d="M300 340v270" stroke="var(--color-red)" strokeWidth="4" opacity="0.9" />
      <path d="M178 245 300 174l122 71-122 71-122-71Z" fill="var(--color-acid)" opacity="0.92" />
      <path d="M300 174v142" stroke="var(--color-void)" strokeWidth="7" opacity="0.75" />

      <rect x="70" y="430" width="460" height="120" fill="url(#hero-dots)" opacity="0.5" />

      <g opacity="0.8">
        <rect x="410" y="120" width="6" height="76" fill="var(--color-acid)" />
        <rect x="424" y="120" width="2" height="76" fill="var(--color-cyan)" />
        <rect x="436" y="120" width="10" height="42" fill="var(--color-red)" />
      </g>

      <path d="M0 690h600" stroke="var(--color-line)" strokeWidth="1" />
      <path d="M0 704h420" stroke="var(--color-line)" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
