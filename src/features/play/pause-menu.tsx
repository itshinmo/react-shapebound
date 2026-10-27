import { useEffect, useId, useRef, useState } from 'react';

import { useSettings } from '@/features/settings/settings-context';
import {
  GLOW_INTENSITY_MAX,
  GLOW_INTENSITY_MIN,
  GLOW_INTENSITY_STEP,
  getSystemReducedMotion,
} from '@/features/settings/settings-storage';
import { formatElapsed } from '@/game/run';
import { cx } from '@/shared/lib/cx';
import { Button } from '@/shared/ui/button';
import { GlowPreview } from '@/shared/ui/glow-preview';

import type { CSSProperties } from 'react';

type PauseSection = 'config' | 'restart' | 'back';

export interface PauseMenuProps {
  readonly frozenElapsedMs: number;
  readonly suspended?: boolean;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onBackToTitle: () => void;
}

const RAIL_IDS: Record<PauseSection, string> = {
  config: 'pause-rail-config',
  restart: 'pause-rail-restart',
  back: 'pause-rail-back',
};

const RAIL_LABELS: Record<PauseSection, { readonly label: string; readonly sublabel: string }> = {
  config: { label: 'CONFIG', sublabel: 'MOTION + GLOW' },
  restart: { label: 'RESTART', sublabel: 'DISCARD THIS RUN' },
  back: { label: 'BACK TO TITLE', sublabel: 'DISCARD THIS RUN' },
};

const RAIL_BUTTON_CLASS =
  'relative flex min-h-11 w-full flex-col justify-center px-3 py-1.5 text-left transition-colors duration-150 ease-snap hover:bg-cyan/5 focus-visible:outline-cyan focus-visible:[outline-offset:-2px]';

const RAIL_LABEL_BASE =
  'font-display text-[0.8rem] leading-tight font-semibold tracking-[0.16em] uppercase';

const RAIL_LABEL_CLASS = cx(RAIL_LABEL_BASE, 'text-ink');
const RAIL_LABEL_MUTED_CLASS = cx(RAIL_LABEL_BASE, 'text-muted');

const RAIL_SUBLABEL_CLASS =
  'font-mono text-[0.52rem] leading-tight tracking-[0.14em] text-muted uppercase';

const PANEL_BODY_COPY =
  'Changes apply immediately. The run stays frozen. Local data cannot be reset here.';
const GLOW_COPY =
  'Adjust the glow on every in-run surface: the play field, enemies, warnings, timeline, boss banner, pause menu, and run-over. Presentation pages keep fixed glows.';
const GLOW_HELP = 'IN-RUN GLOW ONLY. PRESENTATION PAGES STAY FIXED.';

const RAIL_WIDTH_CLASS =
  'w-[min(88vw,21rem,calc(100vw_-_env(safe-area-inset-left)_-_env(safe-area-inset-right)_-_2rem))]';
const EXPANDED_WIDTH_CLASS =
  'w-[min(94vw,56rem,calc(100vw_-_env(safe-area-inset-left)_-_env(safe-area-inset-right)_-_2rem))]';

export function PauseMenu({
  frozenElapsedMs,
  suspended = false,
  onResume,
  onRestart,
  onBackToTitle,
}: PauseMenuProps) {
  const { settings, setReducedMotion, setGlowIntensity } = useSettings();
  const [selected, setSelected] = useState<PauseSection | null>(null);
  const [shiftPx, setShiftPx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const railRefs = useRef<Record<PauseSection, HTMLButtonElement | null>>({
    config: null,
    restart: null,
    back: null,
  });
  const pendingRailFocusRef = useRef<PauseSection | null>(null);
  const wasSuspendedRef = useRef(suspended);
  const previousSelectedRef = useRef<PauseSection | null | undefined>(undefined);
  const titleId = useId();
  const skillReasonId = useId();
  const clock = formatElapsed(frozenElapsedMs);
  const systemReducedMotion = getSystemReducedMotion();
  const reducedMotion = settings.reducedMotion;
  const expandedVisible = reducedMotion || expanded;
  const backdropVisible = reducedMotion || visible;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    const reopened = wasSuspendedRef.current && !suspended;

    wasSuspendedRef.current = suspended;

    if (suspended) {
      if (dialog.open && typeof dialog.close === 'function') {
        dialog.close();
      }

      return;
    }

    if (!dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }

    if (pendingRailFocusRef.current !== null) {
      const origin = pendingRailFocusRef.current;

      pendingRailFocusRef.current = null;
      railRefs.current[origin]?.focus({ preventScroll: true });
      previousSelectedRef.current = null;
      return;
    }

    if (!reopened && selected === previousSelectedRef.current) {
      return;
    }

    previousSelectedRef.current = selected;

    if (selected === null) {
      resumeRef.current?.focus({ preventScroll: true });
    } else {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [selected, suspended]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    return () => {
      if (dialog.open && typeof dialog.close === 'function') {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Tab' ||
        !event.shiftKey ||
        selected === null ||
        document.activeElement !== headingRef.current
      ) {
        return;
      }

      event.preventDefault();
      railRefs.current[selected]?.focus({ preventScroll: true });
    };

    dialog.addEventListener('keydown', onKeyDown);

    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
    };
  }, [selected]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setVisible(!suspended);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [suspended]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setExpanded(selected !== null);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [selected]);

  useEffect(() => {
    const updateShift = () => {
      if (selected === null) {
        setShiftPx(0);
        return;
      }

      const viewportWidth = window.innerWidth;
      const expandedWidth = Math.min(viewportWidth * 0.94, 56 * 16);
      const rightEdge = viewportWidth / 2 + expandedWidth / 2;
      const safeRight = viewportWidth - 16;

      setShiftPx(-Math.max(0, rightEdge - safeRight));
    };

    const frame = requestAnimationFrame(updateShift);

    window.addEventListener('resize', updateShift);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateShift);
    };
  }, [selected]);

  const selectSection = (section: PauseSection) => {
    setSelected(section);
  };

  const cancelConfirmation = () => {
    if (selected !== 'restart' && selected !== 'back') {
      return;
    }

    const origin = selected;

    pendingRailFocusRef.current = origin;
    setSelected(null);
  };

  const confirmSelection = () => {
    if (selected === 'restart') {
      onRestart();
      return;
    }

    if (selected === 'back') {
      onBackToTitle();
    }
  };

  const motionId = useId();

  return (
    <dialog
      ref={dialogRef}
      id="pause-menu"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="pause-menu-dialog"
      data-reduced-motion={reducedMotion ? 'true' : undefined}
      onCancel={(event) => {
        event.preventDefault();

        if (suspended) {
          return;
        }

        if (selected === 'restart' || selected === 'back') {
          const origin = selected;

          pendingRailFocusRef.current = origin;
          setSelected(null);
          return;
        }

        onResume();
      }}
      className="fixed inset-0 z-[80] m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink"
    >
      <div
        aria-hidden="true"
        data-testid="pause-backdrop"
        className={cx(
          'pointer-events-none fixed inset-0 bg-void/85',
          !reducedMotion && 'transition-opacity duration-150',
          backdropVisible ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div className="relative flex min-h-full items-center justify-center pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
        <div
          data-testid="pause-menu-frame"
          data-expanded={selected !== null ? 'true' : undefined}
          style={{ transform: `translate3d(${shiftPx}px, 0, 0)` }}
          className={cx(
            'clip-border relative flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden [--clip-border:var(--color-cyan)] [--clip-fill:var(--color-void)] clip-corner',
            selected === null ? RAIL_WIDTH_CLASS : EXPANDED_WIDTH_CLASS,
            !reducedMotion &&
              'transition-[width,transform] delay-[40ms] duration-150 ease-snap motion-reduce:delay-0',
          )}
        >
          <div
            aria-hidden="true"
            className={cx(
              'pointer-events-none absolute inset-x-0 top-0 z-20 h-px',
              selected === null ? 'bg-cyan/25' : 'bg-cyan',
            )}
          />

          <header className="relative z-10 flex min-h-9 shrink-0 items-center gap-3 border-b border-line px-3 py-2">
            <h2
              id={titleId}
              className="font-display text-xl leading-none font-bold tracking-[0.04em] text-ink uppercase"
            >
              PAUSED
            </h2>

            <div
              role="group"
              aria-label="Frozen run"
              className="flex min-w-0 items-center gap-1 font-mono text-[0.58rem] tracking-[0.08em] text-ink"
            >
              <span role="group" aria-label="Frozen run time" className="tabular-nums">
                {clock.text}
              </span>
              <span aria-hidden="true" className="text-muted">
                //
              </span>
              <span
                role="group"
                aria-label="Frozen blue points"
                className="hidden items-center gap-1 min-[600px]:flex"
              >
                <span aria-hidden="true" className="size-1.5 shrink-0 bg-survival clip-diamond" />
                <span className="tabular-nums">{formatCount(clock.points)}</span>
              </span>
            </div>

            <p className="ml-auto font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">
              ESC TO RESUME
            </p>
          </header>

          <div
            data-testid="pause-menu-body"
            className={cx(
              'relative flex min-h-0 flex-1',
              selected === null
                ? 'overflow-y-auto overscroll-contain'
                : 'grid grid-cols-[10rem_minmax(0,1fr)] overflow-hidden min-[700px]:grid-cols-[13rem_minmax(0,1fr)]',
            )}
          >
            <nav aria-label="Pause menu" className="min-h-0 shrink-0 overflow-y-auto p-3">
              <ul className="flex flex-col gap-1">
                <li>
                  <button
                    ref={resumeRef}
                    type="button"
                    onClick={onResume}
                    className={RAIL_BUTTON_CLASS}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 bottom-1.5 left-0 w-0.5 bg-acid"
                    />
                    <span className={RAIL_LABEL_CLASS}>RESUME</span>
                    <span className={cx(RAIL_SUBLABEL_CLASS, 'hidden min-[620px]:block')}>
                      RETURN TO RUN
                    </span>
                  </button>
                </li>

                {(Object.keys(RAIL_IDS) as readonly PauseSection[]).map((section) => {
                  const isSelected = selected === section;
                  const item = RAIL_LABELS[section];

                  return (
                    <li key={section}>
                      <button
                        ref={(element) => {
                          railRefs.current[section] = element;
                        }}
                        id={RAIL_IDS[section]}
                        type="button"
                        aria-expanded={isSelected}
                        aria-controls="pause-panel"
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => {
                          selectSection(section);
                        }}
                        className={RAIL_BUTTON_CLASS}
                      >
                        <span className={RAIL_LABEL_CLASS}>{item.label}</span>
                        <span className={cx(RAIL_SUBLABEL_CLASS, 'hidden min-[620px]:block')}>
                          {item.sublabel}
                        </span>
                        {isSelected ? (
                          <span
                            aria-hidden="true"
                            data-testid="pause-selected-bar"
                            className="absolute top-1.5 right-0 bottom-1.5 w-0.5 bg-cyan"
                          />
                        ) : null}
                        {isSelected ? (
                          <span
                            aria-hidden="true"
                            data-testid="pause-connector"
                            className={cx(
                              'pointer-events-none absolute top-1/2 left-full h-0.5 w-3 origin-left bg-cyan text-cyan glow-hud',
                              !reducedMotion && 'transition-transform duration-150 ease-snap',
                              expandedVisible ? 'scale-x-100' : 'scale-x-0',
                            )}
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}

                <li aria-hidden="true" className="my-2 border-t border-line" />

                <li>
                  <button
                    type="button"
                    aria-disabled="true"
                    aria-describedby={skillReasonId}
                    className="relative flex min-h-11 w-full flex-col justify-center px-3 py-1.5 text-left text-muted focus-visible:[outline-offset:-2px] focus-visible:outline-cyan"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 12 12"
                        className="h-3 w-3 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="2.5" y="5" width="7" height="5.5" />
                        <path d="M4 5V3.8a2 2 0 0 1 4 0V5" />
                      </svg>
                      <span className={RAIL_LABEL_MUTED_CLASS}>SKILL TREE</span>
                    </span>
                    <span
                      id={skillReasonId}
                      className={cx(RAIL_SUBLABEL_CLASS, 'mt-0.5 pl-5 text-muted')}
                    >
                      AVAILABLE AFTER THE RUN
                    </span>
                  </button>
                </li>
              </ul>
            </nav>

            {selected !== null ? (
              <div
                id="pause-panel"
                role="region"
                aria-labelledby={RAIL_IDS[selected]}
                data-testid="pause-panel"
                className="relative flex min-h-0 min-w-0 flex-1 flex-col border-l border-line"
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                  <div
                    data-testid="pause-panel-content"
                    className={cx(
                      !reducedMotion && 'transition-[opacity,transform] duration-150 ease-snap',
                      expandedVisible ? 'translate-x-0 opacity-100' : 'translate-x-1.5 opacity-0',
                    )}
                  >
                    <p className="font-mono text-[0.58rem] tracking-[0.2em] text-cyan uppercase">
                      {selected === 'config'
                        ? '/// PAUSE // PREFERENCES'
                        : selected === 'restart'
                          ? '/// CONFIRM // DESTRUCTIVE'
                          : '/// CONFIRM // LEAVE RUN'}
                    </p>

                    <h3
                      ref={headingRef}
                      tabIndex={-1}
                      className="mt-2 font-display text-2xl leading-none font-bold tracking-[0.04em] text-ink uppercase focus:outline-none"
                    >
                      {selected === 'config'
                        ? 'CONFIG'
                        : selected === 'restart'
                          ? 'RESTART RUN'
                          : 'BACK TO TITLE'}
                    </h3>

                    {selected === 'config' ? (
                      <>
                        <p className="mt-2 font-body text-sm leading-snug text-muted">
                          {PANEL_BODY_COPY}
                        </p>

                        <div className="mt-5 border-t border-line pt-4">
                          <h4 className="font-display text-lg leading-none font-semibold tracking-[0.04em] text-ink uppercase">
                            Motion
                          </h4>
                          <p className="mt-1 font-body text-sm leading-snug text-muted">
                            Reduce interface animation and background drift.
                          </p>

                          <label
                            htmlFor={motionId}
                            data-testid="pause-motion-switch"
                            className="motion-switch mt-4 flex cursor-pointer items-center justify-between gap-4 border border-line bg-void/60 px-4 py-3"
                          >
                            <span className="font-mono text-[0.66rem] tracking-[0.18em] text-ink uppercase">
                              REDUCE MOTION
                            </span>
                            <input
                              id={motionId}
                              type="checkbox"
                              checked={settings.reducedMotion}
                              onChange={(event) => {
                                setReducedMotion(event.target.checked);
                              }}
                              className="peer sr-only"
                            />
                            <span
                              aria-hidden="true"
                              className="relative inline-flex h-7 w-14 items-center border border-cyan/40 bg-panel-raised transition-colors peer-checked:border-cyan peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-cyan"
                            >
                              <span
                                className={cx(
                                  'absolute inset-0 transition-colors',
                                  settings.reducedMotion ? 'bg-cyan/15' : 'bg-transparent',
                                )}
                              />
                              <span
                                className={cx(
                                  'absolute left-1 h-5 w-5 transition-[translate,background-color] duration-150 ease-snap',
                                  settings.reducedMotion
                                    ? 'translate-x-7 bg-cyan'
                                    : 'translate-x-0 bg-ink',
                                )}
                              />
                            </span>
                          </label>

                          <p className="mt-3 font-mono text-[0.58rem] tracking-[0.18em] text-muted uppercase">
                            SYSTEM DEFAULT: {systemReducedMotion ? 'REDUCED' : 'FULL'}
                          </p>
                        </div>

                        <div className="mt-5 border-t border-line pt-4">
                          <h4 className="font-display text-lg leading-none font-semibold tracking-[0.04em] text-ink uppercase">
                            Glow intensity
                          </h4>
                          <p className="mt-1 font-body text-sm leading-snug text-muted">
                            {GLOW_COPY}
                          </p>

                          <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
                            <div>
                              <div className="flex items-baseline justify-between gap-4">
                                <label
                                  htmlFor="pause-glow-intensity"
                                  className="font-mono text-[0.66rem] tracking-[0.18em] text-ink uppercase"
                                >
                                  GLOW INTENSITY
                                </label>
                                <span
                                  aria-hidden="true"
                                  className="font-mono text-[0.66rem] tracking-[0.18em] text-cyan"
                                >
                                  {settings.glowIntensity}%
                                </span>
                              </div>
                              <input
                                id="pause-glow-intensity"
                                type="range"
                                min={GLOW_INTENSITY_MIN}
                                max={GLOW_INTENSITY_MAX}
                                step={GLOW_INTENSITY_STEP}
                                value={settings.glowIntensity}
                                onChange={(event) => {
                                  setGlowIntensity(Number(event.currentTarget.value));
                                }}
                                aria-describedby="pause-glow-intensity-help"
                                className="range-glow mt-3"
                                style={
                                  {
                                    '--range-progress': `${settings.glowIntensity}%`,
                                  } as CSSProperties
                                }
                              />
                              <p
                                id="pause-glow-intensity-help"
                                className="mt-3 font-mono text-[0.58rem] leading-relaxed tracking-[0.16em] text-muted uppercase"
                              >
                                {GLOW_HELP}
                              </p>
                            </div>

                            <div>
                              <GlowPreview intensity={settings.glowIntensity} />
                              <p className="mt-3 text-center font-mono text-[0.55rem] tracking-[0.2em] text-muted uppercase">
                                STATIC PREVIEW
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 font-body text-sm leading-snug text-muted">
                          {selected === 'restart'
                            ? 'This ends the current run immediately. Its time and points are discarded. Saved progression is not changed.'
                            : 'This ends the current run and returns to the title. Its time and points are discarded. Saved progression is not changed.'}
                        </p>

                        <div className="mt-5 flex flex-col gap-2">
                          <Button
                            variant="ghost"
                            size="lg"
                            onClick={cancelConfirmation}
                            className="w-full"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="danger"
                            size="lg"
                            onClick={confirmSelection}
                            className="w-full"
                          >
                            {selected === 'restart' ? 'Confirm restart' : 'Confirm back to title'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <footer className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-line px-3 py-2">
            <p className="font-mono text-[0.5rem] leading-relaxed tracking-[0.14em] text-muted uppercase">
              TAB / SHIFT+TAB TO NAVIGATE // ESC TO RESUME
            </p>
            <p className="font-mono text-[0.5rem] tracking-[0.14em] text-muted uppercase">
              LOCAL // FROZEN
            </p>
          </footer>
        </div>
      </div>
    </dialog>
  );
}

function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
