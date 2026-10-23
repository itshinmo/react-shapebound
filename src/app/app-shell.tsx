import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

import type { ReactNode } from 'react';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation();
  const firstRender = useRef(true);
  const isPlay = pathname === '/play';

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="relative min-h-svh overflow-x-clip bg-void pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="clip-border fixed top-4 left-4 z-[100] -translate-y-24 px-4 py-2 font-mono text-[0.66rem] tracking-[0.18em] text-acid uppercase transition-transform [--clip-border:var(--color-acid)] [--clip-fill:var(--color-void)] clip-corner-sm focus:translate-y-0 focus-visible:outline-none focus-visible:[--clip-border-width:2px] focus-visible:[--clip-border:var(--color-cyan)]"
      >
        Skip to content
      </a>

      {isPlay ? null : (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 bg-scanlines opacity-[0.04]"
        />
      )}

      <main id="main-content" tabIndex={-1} className="relative z-10 min-h-svh outline-none">
        {children}
      </main>
    </div>
  );
}
