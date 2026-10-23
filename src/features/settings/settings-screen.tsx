import { useState } from 'react';
import { Link } from 'react-router';

import { cx } from '@/shared/lib/cx';
import { Button } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/panel';
import { SectionLabel } from '@/shared/ui/section-label';

import { useSettings } from './settings-context';
import { getSystemReducedMotion } from './settings-storage';

export function SettingsScreen() {
  const { settings, setReducedMotion, resetLocalData } = useSettings();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const systemReducedMotion = getSystemReducedMotion();

  const handleReset = () => {
    resetLocalData();
    setConfirmingReset(false);
    setStatus('Local data cleared. Settings reset to system defaults.');
  };

  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-void">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aurora" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-40" />

      <header className="relative flex items-center justify-between gap-4 border-b-4 border-ink-inverse bg-paper px-4 py-3 text-ink-inverse sm:px-6 lg:px-10">
        <Link
          to="/"
          className="font-mono text-[0.62rem] tracking-[0.22em] uppercase transition-opacity hover:opacity-60"
        >
          ← TITLE
        </Link>
        <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase">
          LOCAL CONFIG // 01
        </span>
      </header>

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-10">
        <SectionLabel tone="cyan">LOCAL_PROFILE // PREFERENCES</SectionLabel>

        <h1 className="mt-4 font-hero text-[clamp(4rem,8vw,7rem)] leading-[0.82] tracking-[-0.02em] text-ink uppercase">
          CONFIGURE
        </h1>
        <p className="mt-3 max-w-2xl font-body text-lg leading-snug text-muted">
          Settings are stored locally in this browser. Nothing leaves the device.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Panel tone="cyan" className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[0.58rem] tracking-[0.2em] text-cyan uppercase">
                  /// DISPLAY_MODULE
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase">
                  Motion
                </h2>
                <p className="mt-1 font-body text-sm leading-snug text-muted">
                  Reduce interface animation and background drift.
                </p>
              </div>
              <span
                aria-hidden="true"
                className={cx(
                  'mt-1 h-2 w-2 rounded-full',
                  settings.reducedMotion ? 'bg-cyan' : 'bg-line-bright',
                )}
              />
            </div>

            <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 border border-line bg-void/60 px-4 py-3">
              <span className="font-mono text-[0.66rem] tracking-[0.18em] text-ink uppercase">
                REDUCE MOTION
              </span>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(event) => {
                  setReducedMotion(event.target.checked);
                  setStatus(null);
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
                    'absolute left-1 h-5 w-5 transition-transform',
                    settings.reducedMotion ? 'translate-x-7 bg-cyan' : 'bg-ink',
                  )}
                />
              </span>
            </label>

            <p className="mt-3 font-mono text-[0.58rem] tracking-[0.18em] text-muted uppercase">
              SYSTEM DEFAULT: {systemReducedMotion ? 'REDUCED' : 'FULL'}
            </p>
          </Panel>

          <Panel tone="acid" className="p-5">
            <p className="font-mono text-[0.58rem] tracking-[0.2em] text-acid uppercase">
              /// STORAGE_MODULE
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase">
              Local Data
            </h2>
            <p className="mt-1 font-body text-sm leading-snug text-muted">
              Settings and save data live in localStorage. Clearing them cannot be undone.
            </p>

            <div className="mt-6 border border-red/40 bg-red/5 p-4">
              <p className="font-mono text-[0.6rem] tracking-[0.2em] text-red uppercase">
                DANGER ZONE
              </p>
              {confirmingReset ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button variant="danger" onClick={handleReset}>
                    Confirm reset
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setConfirmingReset(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="mt-3">
                  <Button
                    variant="danger"
                    onClick={() => {
                      setConfirmingReset(true);
                    }}
                  >
                    Clear local data
                  </Button>
                </div>
              )}
            </div>

            {status !== null && (
              <p
                role="status"
                className="mt-4 border border-cyan/40 bg-cyan/5 px-3 py-2 font-mono text-[0.6rem] leading-relaxed tracking-[0.14em] text-cyan uppercase"
              >
                {status}
              </p>
            )}
          </Panel>
        </div>

        <div className="mt-6 border border-line bg-panel/50 p-4">
          <SectionLabel tone="acid">STORAGE_KEYS</SectionLabel>
          <ul className="mt-3 grid gap-1 font-mono text-[0.62rem] text-muted sm:grid-cols-2">
            <li>shapebound:settings</li>
            <li>shapebound:save</li>
          </ul>
        </div>

        <footer className="mt-auto border-t border-line pt-4">
          <p className="font-mono text-[0.58rem] tracking-[0.24em] text-muted uppercase">
            SHAPEBOUND // CONFIG // LOCAL ONLY
          </p>
        </footer>
      </div>
    </div>
  );
}
