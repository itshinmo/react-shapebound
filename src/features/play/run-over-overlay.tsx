import { useEffect, useId, useRef, useState } from 'react';

import type { ProgressionData } from '@/game/progression';
import { formatElapsed } from '@/game/run';
import type { CommitStatus } from '@/game/run';
import { Button, LinkButton } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/panel';

interface RunOverOverlayProps {
  readonly finalElapsedMs: number;
  readonly commit: CommitStatus;
  readonly committedData: ProgressionData | null;
  readonly onRetry: () => void;
  readonly onRetryCommit: () => void;
}

const UNREADABLE_HEADING = 'SAVED PROGRESS COULD NOT BE READ — THIS RUN WAS NOT SAVED';
const UNREADABLE_BODY =
  "The existing local save is unreadable. Nothing was written or overwritten, so this run's points and time are not saved. Open Settings to reset local data; after the reset, the next death can write a fresh record. Navigating away (skill tree, settings, or title) or starting a new run discards this run's unsaved points.";
const UNAVAILABLE_HEADING = 'LOCAL STORAGE IS UNAVAILABLE — THIS RUN WAS NOT SAVED';
const UNAVAILABLE_BODY =
  "This browser is blocking local storage. Nothing was written. A reset cannot repair an absent storage API. Navigating away (skill tree or title) or starting a new run discards this run's unsaved points.";

export function RunOverOverlay({
  finalElapsedMs,
  commit,
  committedData,
  onRetry,
  onRetryCommit,
}: RunOverOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const retrySaveRequestedRef = useRef(false);
  const [retrySaveRequest, setRetrySaveRequest] = useState(0);
  const titleId = useId();
  const summaryId = useId();
  const statusId = useId();
  const warningId = useId();
  const pendingReasonId = useId();
  const retrySaveHelperId = useId();

  const status = commit === 'none' ? 'pending' : commit;
  const isPending = status === 'pending';
  const warning = status === 'unreadable' || status === 'unavailable' ? status : null;
  const statusRole = status === 'failed' ? 'alert' : warning === null ? 'status' : undefined;
  const clock = formatElapsed(finalElapsedMs);
  const finalPoints = Math.floor(finalElapsedMs / 1_000);
  const skillTreeDescribedBy =
    status === 'pending'
      ? pendingReasonId
      : status === 'failed'
        ? statusId
        : warning === null
          ? undefined
          : warningId;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (!dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }

    headingRef.current?.focus();

    return () => {
      if (dialog.open && typeof dialog.close === 'function') {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!retrySaveRequestedRef.current || status === 'pending') {
      return;
    }

    retrySaveRequestedRef.current = false;
    statusRef.current?.focus();
  }, [retrySaveRequest, status]);

  const handleRetrySave = () => {
    retrySaveRequestedRef.current = true;
    setRetrySaveRequest((value) => value + 1);
    onRetryCommit();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={`${summaryId} ${statusId}`}
      onCancel={(event) => {
        event.preventDefault();
      }}
      className="fixed inset-0 z-[70] m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-red"
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-void/90" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-grid opacity-20" />

      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="w-[min(92vw,34rem)] text-red glow-danger">
          <Panel
            tone="red"
            className="max-h-[calc(100svh-2rem)] w-full overflow-y-auto overscroll-contain p-5 text-center min-[480px]:text-left sm:p-7"
          >
            <p className="font-mono text-[0.62rem] tracking-[0.22em] text-red uppercase">
              /// RUN TERMINATED
            </p>

            <h2
              ref={headingRef}
              id={titleId}
              tabIndex={-1}
              className="mt-3 font-hero text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.82] text-red uppercase focus:outline-none"
            >
              SIGNAL LOST
            </h2>

            <p className="mt-3 font-body text-sm text-muted uppercase">
              THE RUN IS OVER. THE CLOCK HAS STOPPED.
            </p>

            {status === 'unreadable' ? (
              <div id={warningId} role="alert" className="mt-4 border-l-2 border-acid pl-3">
                <p className="font-mono text-[0.62rem] leading-relaxed tracking-[0.14em] text-acid uppercase">
                  {UNREADABLE_HEADING}
                </p>
                <p className="mt-2 font-body text-sm leading-snug text-muted">{UNREADABLE_BODY}</p>
              </div>
            ) : null}

            {status === 'unavailable' ? (
              <div id={warningId} role="alert" className="mt-4 border-l-2 border-red pl-3">
                <p className="font-mono text-[0.62rem] leading-relaxed tracking-[0.14em] text-red uppercase">
                  {UNAVAILABLE_HEADING}
                </p>
                <p className="mt-2 font-body text-sm leading-snug text-muted">{UNAVAILABLE_BODY}</p>
              </div>
            ) : null}

            <div
              id={summaryId}
              data-testid="run-over-summary"
              className="mt-5 grid gap-3 min-[480px]:grid-cols-2"
            >
              <div role="group" aria-label="Final time">
                <p className="font-mono text-[0.55rem] tracking-[0.22em] text-muted uppercase">
                  TIME
                </p>
                <p className="mt-1 font-mono text-[1.8rem] leading-none text-ink tabular-nums">
                  {clock.text}
                </p>
              </div>

              <div role="group" aria-label="Blue points">
                <p className="font-mono text-[0.55rem] tracking-[0.22em] text-muted uppercase">
                  POINTS
                </p>
                <p className="mt-1 flex items-center justify-center gap-2 font-mono text-[1.8rem] leading-none text-ink tabular-nums min-[480px]:justify-start">
                  <span aria-hidden="true" className="size-2.5 shrink-0 bg-survival clip-diamond" />
                  <span>{formatCount(finalPoints)}</span>
                </p>
              </div>
            </div>

            <div
              ref={statusRef}
              id={statusId}
              tabIndex={-1}
              role={statusRole}
              className="mt-5 border-t border-line pt-3"
            >
              {status === 'saved' ? (
                <>
                  <p className="flex items-center justify-center gap-2 font-mono text-[0.62rem] tracking-[0.18em] text-acid uppercase min-[480px]:justify-start">
                    <span aria-hidden="true" className="size-2 shrink-0 bg-acid" />
                    PROGRESS SAVED
                  </p>
                  {finalPoints === 0 ? (
                    <p className="mt-1 font-body text-xs text-muted uppercase">
                      NO POINTS THIS RUN
                    </p>
                  ) : committedData === null ? null : (
                    <p className="mt-1 font-mono text-[0.62rem] tracking-[0.14em] text-muted uppercase">
                      SAVED BALANCE: {formatCount(committedData.bluePoints)}
                    </p>
                  )}
                </>
              ) : null}

              {isPending ? (
                <p className="font-mono text-[0.62rem] tracking-[0.18em] text-cyan uppercase">
                  COMMITTING PROGRESS…
                </p>
              ) : null}

              {status === 'failed' ? (
                <>
                  <p className="font-mono text-[0.62rem] tracking-[0.16em] text-red uppercase">
                    SAVE FAILED — POINTS NOT SAVED
                  </p>
                  <p className="mt-2 font-body text-sm leading-snug text-muted">
                    STARTING A NEW RUN OR LEAVING DISCARDS THESE POINTS.
                  </p>
                </>
              ) : null}

              {status === 'unreadable' ? (
                <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
                  NOT SAVED // UNREADABLE SAVE
                </p>
              ) : null}

              {status === 'unavailable' ? (
                <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
                  NOT SAVED // STORAGE UNAVAILABLE
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-2 min-[480px]:flex-row min-[480px]:flex-wrap">
              <Button
                variant="primary"
                size="lg"
                onClick={onRetry}
                className="w-full min-[480px]:w-auto"
              >
                Retry
              </Button>

              <div className="flex flex-col gap-1">
                <LinkButton
                  to="/skills"
                  variant="secondary"
                  size="lg"
                  aria-disabled={isPending ? 'true' : undefined}
                  aria-describedby={skillTreeDescribedBy}
                  onClick={
                    isPending
                      ? (event) => {
                          event.preventDefault();
                        }
                      : undefined
                  }
                  className="w-full min-[480px]:w-auto"
                >
                  Open Skill Tree
                </LinkButton>
                {isPending ? (
                  <p
                    id={pendingReasonId}
                    className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase"
                  >
                    FINISHING SAVE…
                  </p>
                ) : null}
              </div>

              {status === 'unreadable' ? (
                <div className="flex flex-col gap-1">
                  <LinkButton
                    to="/settings"
                    variant="secondary"
                    size="lg"
                    aria-describedby={warningId}
                    className="w-full min-[480px]:w-auto"
                  >
                    Open Settings
                  </LinkButton>
                  <p className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">
                    RESET IN SETTINGS
                  </p>
                </div>
              ) : null}

              <LinkButton to="/" variant="ghost" size="lg" className="w-full min-[480px]:w-auto">
                Back to title
              </LinkButton>

              {status === 'failed' ? (
                <div className="flex flex-col gap-1">
                  <Button
                    variant="secondary"
                    size="lg"
                    aria-describedby={retrySaveHelperId}
                    onClick={handleRetrySave}
                    className="w-full min-[480px]:w-auto"
                  >
                    Retry save
                  </Button>
                  <p
                    id={retrySaveHelperId}
                    className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase"
                  >
                    SAME TOTAL // NOT ADDED AGAIN
                  </p>
                </div>
              ) : null}
            </div>

            <p className="mt-6 border-t border-line pt-4 font-mono text-[0.55rem] tracking-[0.18em] text-muted uppercase">
              NO CONTINUE // NO MID-RUN SAVE
            </p>
          </Panel>
        </div>
      </div>
    </dialog>
  );
}

function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
