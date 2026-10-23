import { APP_TAGLINE, APP_TITLE, APP_VERSION } from '@/shared/config/app-config';
import { LinkButton } from '@/shared/ui/button';
import { SectionLabel } from '@/shared/ui/section-label';

import { HeroArt } from './hero-art';

const buildDetails = [`BUILD ${APP_VERSION}`, 'BROWSER ROUTER', 'NO CANVAS', 'OFFLINE'] as const;

const systemRows = [
  { label: 'RENDER', value: 'DOM / CSS' },
  { label: 'NETWORK', value: 'OFFLINE' },
  { label: 'SAVE', value: 'LOCAL' },
  { label: 'STATUS', value: 'PROTOTYPE' },
] as const;

export function TitleScreen() {
  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip">
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-4 pb-4 sm:px-6 lg:px-10">
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
              <span aria-hidden="true" className="block animate-glitch text-glitch">
                SHAPE
              </span>
              <span aria-hidden="true" className="block">
                BOUND
              </span>
            </h1>

            <p className="mt-6 max-w-xl border-l-4 border-red pl-4 font-body text-xl leading-tight text-ink-inverse/80 sm:text-2xl">
              {APP_TAGLINE}. A single-player, offline game rendered entirely with HTML, CSS, and
              React. No canvas. No backend. No signal loss.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/play" variant="inverse" size="lg">
                INITIALIZE <span aria-hidden="true">→</span>
              </LinkButton>
              <LinkButton to="/settings" variant="secondary" size="lg">
                CONFIGURE
              </LinkButton>
            </div>

            <ul
              aria-label="Build details"
              className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.58rem] tracking-[0.2em] text-ink-inverse/60 uppercase"
            >
              {buildDetails.map((detail) => (
                <li key={detail} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 border border-ink-inverse bg-red"
                  />
                  {detail}
                </li>
              ))}
            </ul>
          </section>

          <aside className="relative">
            <div className="clip-border relative p-3 [--clip-border:var(--color-ink-inverse)] [--clip-fill:var(--color-void)] clip-corner sm:p-4">
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
