import { Link } from 'react-router';

import { cx } from '@/shared/lib/cx';
import { LinkButton } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/panel';
import { SectionLabel } from '@/shared/ui/section-label';

const cells = Array.from({ length: 49 }, (_, index) => index);

export function PlayScreen() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-void">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aurora" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-50" />

      <header className="relative flex items-center justify-between gap-4 border-b-4 border-acid bg-paper px-4 py-3 text-ink-inverse sm:px-6 lg:px-10">
        <Link
          to="/"
          className="font-mono text-[0.62rem] tracking-[0.22em] uppercase transition-opacity hover:opacity-60"
        >
          ← RETURN TO TITLE
        </Link>
        <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase">
          SESSION // UNINITIALIZED
        </span>
      </header>

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <SectionLabel tone="red">PLAY_MODULE // SCAFFOLD</SectionLabel>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[0.8fr_1.2fr]">
          <section aria-labelledby="play-heading">
            <p className="mt-5 font-mono text-[0.62rem] tracking-[0.22em] text-magenta uppercase">
              MECHANIC MODULE // MISSING
            </p>
            <h1
              id="play-heading"
              className="mt-3 font-hero text-[clamp(4rem,9vw,8rem)] leading-[0.82] tracking-[-0.02em] uppercase"
            >
              <span className="block text-ink">GAME</span>
              <span className="block text-ink/90">SHELL</span>
            </h1>
            <p className="mt-5 max-w-md font-body text-lg leading-snug text-muted">
              The board is a DOM scaffold. No rules, turns, or win conditions exist yet.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/settings" variant="primary">
                CONFIGURE
              </LinkButton>
              <LinkButton to="/" variant="secondary">
                BACK TO TITLE
              </LinkButton>
            </div>

            <div className="mt-8 border-l-2 border-cyan pl-4">
              <p className="font-mono text-[0.6rem] tracking-[0.2em] text-cyan uppercase">
                NEXT STEP
              </p>
              <p className="mt-1 font-body text-sm leading-snug text-muted">
                Describe the game. We will run the design-a-mechanic pipeline, then implement the
                rules in <code className="font-mono text-[0.72rem] text-ink">src/game</code>.
              </p>
            </div>
          </section>

          <Panel tone="acid" className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
              <p className="font-mono text-[0.6rem] tracking-[0.2em] text-acid uppercase">
                /// BOARD_PREVIEW
              </p>
              <span className="bg-cyan px-2 py-1 font-mono text-[0.58rem] font-bold text-ink-inverse">
                07 × 07
              </span>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5" aria-hidden="true">
              {cells.map((cell) => (
                <div
                  key={cell}
                  className={cx(
                    'aspect-square border border-line bg-panel-raised',
                    cell % 8 === 0 && 'border-cyan/40 bg-cyan/5',
                    cell === 24 && 'border-acid bg-acid/15',
                    cell === 3 && 'border-red/60 bg-red/10',
                  )}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-3">
              <span className="font-mono text-[0.58rem] tracking-[0.18em] text-muted uppercase">
                RENDER: DOM GRID
              </span>
              <span className="font-mono text-[0.58rem] tracking-[0.18em] text-magenta uppercase">
                AWAITING RULES
              </span>
            </div>
          </Panel>
        </div>

        <div aria-hidden="true" className="h-2 w-full bg-glitch opacity-70" />

        <footer className="mt-6 border-t border-line pt-4">
          <p className="font-mono text-[0.58rem] tracking-[0.24em] text-muted uppercase">
            SHAPEBOUND // GAME SHELL // NO MECHANICS LOADED
          </p>
        </footer>
      </div>
    </div>
  );
}
