import { memo } from 'react';
import { Link, NavLink } from 'react-router';

import { cx } from '@/shared/lib/cx';
import { LinkButton } from '@/shared/ui/button';
import { ShapeMark } from '@/shared/ui/shape-mark';

const navItems = [
  { to: '/', label: '01 // TITLE' },
  { to: '/play', label: '02 // PLAY' },
  { to: '/settings', label: '03 // CONFIG' },
  { to: '/skills', label: '04 // SKILLS' },
] as const;

function SiteHeaderComponent() {
  return (
    <header className="clip-border relative flex items-center justify-between gap-4 px-4 py-3 text-ink [--clip-border:var(--color-acid)] [--clip-fill:var(--color-void)] clip-nav sm:px-6">
      <Link to="/" className="flex min-w-0 items-center gap-3">
        <ShapeMark className="h-8 w-8 shrink-0 text-acid" />
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.55rem] tracking-[0.3em] text-muted uppercase">
            SHAPEBOUND // SYSTEM
          </p>
          <p className="truncate font-display text-sm font-semibold tracking-[0.18em] text-ink uppercase">
            LOCAL INTERFACE
          </p>
        </div>
      </Link>

      <nav
        aria-label="Primary"
        className="hidden items-center gap-5 font-mono text-[0.6rem] tracking-[0.2em] uppercase md:flex"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cx('transition-colors', isActive ? 'text-acid' : 'text-muted hover:text-cyan')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-2 font-mono text-[0.55rem] tracking-[0.2em] text-muted uppercase sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse-line bg-acid" />
          LOCAL LINK
        </span>
        <div className="hidden sm:inline-flex">
          <LinkButton to="/play" className="px-4 py-2 text-[0.62rem]">
            INITIALIZE <span aria-hidden="true">→</span>
          </LinkButton>
        </div>
      </div>
    </header>
  );
}

export const SiteHeader = memo(SiteHeaderComponent);
