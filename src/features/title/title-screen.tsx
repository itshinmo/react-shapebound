import { Link } from 'react-router';

import { APP_TAGLINE, APP_TITLE, APP_VERSION } from '@/shared/config/app-config';
import { LinkButton } from '@/shared/ui/button';
import { SectionLabel } from '@/shared/ui/section-label';
import { ShapeMark } from '@/shared/ui/shape-mark';

import { HeroArt } from './hero-art';

const systemRows = [
  { label: 'RENDER', value: 'DOM / CSS' },
  { label: 'NETWORK', value: 'OFFLINE' },
  { label: 'SAVE', value: 'LOCAL' },
  { label: 'STATUS', value: 'PROTOTYPE' },
] as const;

export function TitleScreen() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-paper text-ink-inverse">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-halftone opacity-30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-drift bg-grid-ink opacity-30"
      />

      <div className="relative mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-4 py-4 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between gap-4 border border-acid bg-void px-4 py-3 text-ink clip-nav sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <ShapeMark className="h-8 w-8 shrink-0 text-acid" />
            <div className="min-w-0">
              <p className="truncate font-mono text-[0.55rem] tracking-[0.3em] text-muted uppercase">
                SHAPEBOUND // SYSTEM
              </p>
              <p className="truncate font-display text-sm font-semibold tracking-[0.18em] text-ink uppercase">
                LOCAL INTERFACE
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-5 font-mono text-[0.6rem] tracking-[0.2em] text-muted uppercase md:flex">
            <span className="text-acid">01 // TITLE</span>
            <Link to="/play" className="transition-colors hover:text-cyan">
              02 // PLAY
            </Link>
            <Link to="/settings" className="transition-colors hover:text-cyan">
              03 // CONFIG
            </Link>
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

        <div className="grid items-start gap-8 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:py-10">
          <section aria-labelledby="title-heading" className="relative z-10 pt-2">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[0.6rem] tracking-[0.22em] uppercase">
              <span className="h-2 w-2 bg-ink-inverse" />
              <span className="text-ink-inverse">PROTOTYPE BUILD</span>
              <span
                aria-hidden="true"
                className="hidden h-px min-w-8 flex-1 bg-ink-inverse/30 sm:block"
              />
              <span className="text-ink-inverse/60">MOVEMENT SLICE</span>
            </div>

            <h1
              id="title-heading"
              aria-label={APP_TITLE}
              className="mt-5 font-hero text-[clamp(3.5rem,15vw,12rem)] leading-[0.8] tracking-[-0.02em] uppercase"
            >
              <span aria-hidden="true" className="block text-glitch">
                SHAPE
              </span>
              <span aria-hidden="true" className="block">
                BOUND
              </span>
            </h1>

            <div className="mt-6 flex items-start gap-4">
              <div aria-hidden="true" className="mt-1 h-16 w-1 shrink-0 bg-red" />
              <p className="max-w-xl font-body text-xl leading-tight text-ink-inverse/80 sm:text-2xl">
                {APP_TAGLINE}. A single-player, offline game rendered entirely with HTML, CSS, and
                React. No canvas. No backend. No signal loss.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/play" variant="inverse" size="lg">
                INITIALIZE <span aria-hidden="true">→</span>
              </LinkButton>
              <LinkButton to="/settings" variant="secondary" size="lg">
                CONFIGURE
              </LinkButton>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.58rem] tracking-[0.2em] text-ink-inverse/60 uppercase">
              <span>BUILD {APP_VERSION}</span>
              <span aria-hidden="true" className="h-1 w-1 bg-red" />
              <span>HASH ROUTER</span>
              <span aria-hidden="true" className="h-1 w-1 bg-cyan" />
              <span>NO CANVAS</span>
              <span aria-hidden="true" className="h-1 w-1 bg-ink-inverse" />
              <span>OFFLINE</span>
            </div>
          </section>

          <aside className="relative">
            <div className="border border-ink-inverse bg-void p-3 clip-corner sm:p-4">
              <div className="relative overflow-hidden border border-line bg-panel">
                <HeroArt className="h-[20rem] w-full sm:h-[23rem] lg:h-[26rem]" />
                <div aria-hidden="true" className="absolute inset-0 bg-scanlines opacity-30" />
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-void/80 px-2 py-1 font-mono text-[0.55rem] tracking-[0.2em] text-acid uppercase">
                  <span className="h-1.5 w-1.5 animate-pulse-line bg-red" />
                  SIGNAL // LIVE
                </div>
                <div className="absolute right-4 bottom-4 bg-acid px-2 py-1 font-mono text-[0.55rem] font-bold tracking-[0.16em] text-ink-inverse uppercase">
                  01 // SHAPE
                </div>
              </div>

              <div className="mt-3 border border-acid bg-void p-4">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <p className="font-mono text-[0.55rem] tracking-[0.24em] text-muted uppercase">
                    SYSTEM DIAGNOSTICS
                  </p>
                  <span className="font-mono text-[0.55rem] text-acid">01</span>
                </div>

                <dl className="mt-1 divide-y divide-line/70">
                  {systemRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 py-2">
                      <dt className="font-mono text-[0.55rem] tracking-[0.2em] text-muted uppercase">
                        {row.label}
                      </dt>
                      <dd className="font-mono text-[0.62rem] tracking-[0.14em] text-ink uppercase">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 border border-cyan/40 bg-cyan/5 p-3">
                  <p className="font-mono text-[0.55rem] tracking-[0.2em] text-cyan uppercase">
                    CURRENT SLICE
                  </p>
                  <p className="mt-1 font-body text-sm leading-snug text-ink/80">
                    The play screen has a movable square on a landscape-only board. Combat, bosses,
                    points, and the skill tree are not built.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-between font-mono text-[0.55rem] tracking-[0.2em] text-ink-inverse/60 uppercase">
              <span>NO BACKEND</span>
              <span>NO TELEMETRY</span>
              <span>LOCAL ONLY</span>
            </div>
          </aside>
        </div>

        <section className="border border-ink-inverse bg-void p-4 text-ink sm:p-5">
          <SectionLabel tone="cyan">SYSTEM_MODULES</SectionLabel>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <article className="border border-cyan/50 bg-panel p-4">
              <p className="font-mono text-[0.58rem] tracking-[0.2em] text-cyan uppercase">
                MODULE_01 // RENDER
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.02em] uppercase">
                DOM + CSS
              </h2>
              <p className="mt-2 font-body text-sm leading-snug text-muted">
                Semantic elements, CSS layout, and keyboard access. No canvas, no WebGL.
              </p>
              <span className="mt-4 inline-block border border-cyan px-2 py-1 font-mono text-[0.55rem] tracking-[0.16em] text-cyan uppercase">
                ONLINE
              </span>
            </article>

            <article className="border border-acid/50 bg-panel p-4">
              <p className="font-mono text-[0.58rem] tracking-[0.2em] text-acid uppercase">
                MODULE_02 // MOVEMENT
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.02em] uppercase">
                PLAYABLE SLICE
              </h2>
              <p className="mt-2 font-body text-sm leading-snug text-muted">
                The play board has a movable square, keyboard input, and a touch joystick. Combat,
                bosses, and progression are not built.
              </p>
              <span className="mt-4 inline-block border border-acid px-2 py-1 font-mono text-[0.55rem] tracking-[0.16em] text-acid uppercase">
                SLICE 01
              </span>
            </article>
          </div>
        </section>

        <footer className="mt-auto border border-ink-inverse bg-void px-4 py-3 text-ink">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[0.58rem] tracking-[0.22em] text-muted uppercase">
              {APP_TITLE} // BUILD {APP_VERSION}
            </p>
            <div aria-hidden="true" className="h-2 w-full max-w-xs bg-hazard opacity-80" />
            <p className="font-mono text-[0.58rem] tracking-[0.22em] text-muted uppercase">
              LOCAL SESSION // 2026
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
