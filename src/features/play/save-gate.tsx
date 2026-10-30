import { useEffect, useId, useRef } from 'react';

import { LinkButton } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/panel';

export type SaveGateReason = 'unreadable' | 'unavailable';

interface SaveGateProps {
  readonly reason: SaveGateReason;
  readonly portrait: boolean;
}

export function SaveGate({ reason, portrait }: SaveGateProps) {
  const gateRef = useRef<HTMLElement>(null);
  const headingId = useId();
  const bodyId = useId();
  const footerId = useId();
  const unreadable = reason === 'unreadable';

  useEffect(() => {
    const gate = gateRef.current;

    if (portrait || gate === null) {
      return;
    }

    const focusGate = () => {
      if (gate.isConnected && !gate.contains(document.activeElement)) {
        gate.focus({ preventScroll: true });
      }
    };

    focusGate();
    queueMicrotask(focusGate);
  }, [portrait]);

  return (
    <section
      ref={gateRef}
      role="alert"
      aria-labelledby={headingId}
      aria-describedby={`${bodyId} ${footerId}`}
      tabIndex={-1}
      inert={portrait}
      className="fixed inset-0 z-[150] grid place-items-center overflow-hidden bg-void px-6 py-10 focus:outline-none"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-20" />

      <div className="relative w-full max-w-lg">
        <Panel tone="red" className="p-5 clip-corner sm:p-6">
          <p className="font-mono text-[0.58rem] tracking-[0.22em] text-red uppercase">
            /// RUN GATE // LOCAL SAVE
          </p>

          <h1
            id={headingId}
            className="mt-3 font-display text-[clamp(1.75rem,6vw,2.5rem)] leading-[1.05] font-bold tracking-[0.02em] text-ink uppercase"
          >
            {unreadable ? 'SAVED PROGRESS COULD NOT BE READ' : 'LOCAL STORAGE IS UNAVAILABLE'}
          </h1>

          <p id={bodyId} className="mt-3 max-w-prose font-body text-base leading-snug text-muted">
            {unreadable
              ? 'A new run needs a readable local save. The save in this browser could not be read, so no run was started and nothing was overwritten. Open Settings to reset local data; after the reset, return here to start a run. The old record cannot be recovered.'
              : 'This browser is blocking local storage. A new run cannot start because progression cannot be read or saved. A settings reset cannot restore an unavailable storage API.'}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {unreadable ? (
              <div className="flex flex-col gap-1">
                <LinkButton
                  to="/settings"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Open Settings
                </LinkButton>
                <p className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">
                  RESET IN SETTINGS
                </p>
              </div>
            ) : null}
            <LinkButton to="/" variant="ghost" size="lg" className="w-full sm:w-auto">
              Back to title
            </LinkButton>
          </div>

          <p
            id={footerId}
            className="mt-6 border-t border-line pt-3 font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase"
          >
            {unreadable ? 'NO RUN STARTED // NO SAVE WRITTEN' : 'NO RUN STARTED // STORAGE BLOCKED'}
          </p>
        </Panel>
      </div>
    </section>
  );
}
