import { Outlet, useLocation } from 'react-router';

import { cx } from '@/shared/lib/cx';
import { SiteHeader } from '@/shared/ui/site-header';

export function PresentationLayout() {
  const { pathname } = useLocation();
  const isSettings = pathname === '/settings';
  const isSkills = pathname === '/skills';
  const isTitle = pathname === '/';
  const isDarkField = isSettings || isSkills;

  return (
    <div
      className={cx(
        'relative flex min-h-svh flex-col',
        isDarkField ? 'bg-void text-ink' : 'bg-paper text-ink-inverse',
      )}
    >
      {isDarkField ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aurora" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-grid opacity-40"
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-halftone opacity-30"
          />
          <div
            aria-hidden="true"
            className={cx(
              'pointer-events-none absolute inset-0 bg-grid-ink opacity-30',
              isTitle && 'animate-drift',
            )}
          />
        </>
      )}

      <div className="relative mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6 lg:px-10">
        <SiteHeader />
      </div>

      <div className="relative flex flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
