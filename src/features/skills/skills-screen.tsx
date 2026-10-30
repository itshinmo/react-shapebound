import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import { createProgressionStorage } from '@/features/play/progression-storage';
import {
  MAX_BLUE_POINTS,
  createEmptyProgression,
  purchaseUpgrade,
  resetUpgrades,
  type ProgressionData,
  type ProgressionRead,
} from '@/game/progression';
import { formatElapsed } from '@/game/run';
import {
  ARENA_SIZE_PX,
  CHARGE_SPEED_MS,
  MOVEMENT_SPEED_PX_PER_SECOND,
  PLAYER_SIZE_PX,
  UPGRADE_KEYS,
  UPGRADE_MAX_LEVELS,
  type UpgradeKey,
  type UpgradeLevels,
} from '@/game/upgrades';
import { cx } from '@/shared/lib/cx';
import { getBrowserStorage } from '@/shared/lib/storage';
import { Button, LinkButton } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/panel';
import { SectionLabel } from '@/shared/ui/section-label';

import type { RefObject } from 'react';

type EditorState =
  | { readonly kind: 'readable'; readonly data: ProgressionData }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'unavailable' };

type SaveError = 'purchase' | 'reset' | null;

interface UpgradeDefinition {
  readonly label: string;
  readonly effect: (level: number) => string;
}

const UPGRADE_DEFINITIONS: Readonly<Record<UpgradeKey, UpgradeDefinition>> = {
  barrierCount: {
    label: 'Barrier Count',
    effect: (level) => `MAX BARRIER ${level}`,
  },
  movementSpeed: {
    label: 'Movement Speed',
    effect: (level) => `SPEED ${curveAt(MOVEMENT_SPEED_PX_PER_SECOND, level)} PX/S`,
  },
  playerSize: {
    label: 'Player Size',
    effect: (level) => `SIZE ${curveAt(PLAYER_SIZE_PX, level)} PX`,
  },
  arenaSize: {
    label: 'Arena Size',
    effect: (level) => `ARENA ${curveAt(ARENA_SIZE_PX, level)} PX`,
  },
  reflectCharges: {
    label: 'Reflect Charges',
    effect: (level) => `MAX CHARGES ${level}`,
  },
  reflectChargeSpeed: {
    label: 'Charge Speed',
    effect: (level) => `RECHARGE ${formatSeconds(curveAt(CHARGE_SPEED_MS, level))} S`,
  },
  laserPierce: {
    label: 'Laser Pierce',
    effect: (level) => `EXTRA TARGETS ${level}`,
  },
};

const BRANCHES: readonly {
  readonly label: string;
  readonly nodes: readonly UpgradeKey[];
  readonly locked: number;
}[] = [
  { label: 'BARRIER', nodes: ['barrierCount'], locked: 2 },
  { label: 'MOVEMENT', nodes: ['movementSpeed'], locked: 2 },
  { label: 'SIZE', nodes: ['playerSize', 'arenaSize'], locked: 1 },
  { label: 'REFLECT', nodes: ['reflectCharges', 'reflectChargeSpeed', 'laserPierce'], locked: 0 },
];

const RESERVED_BOSS_CURRENCIES = [
  { label: 'PURPLE', diamondClassName: 'bg-boss-purple' },
  { label: 'GREEN', diamondClassName: 'bg-boss-green' },
  { label: 'ORANGE', diamondClassName: 'bg-boss-orange' },
] as const;

export function SkillsScreen() {
  const [storage] = useState(() => createProgressionStorage(getBrowserStorage()));
  const [editor, setEditor] = useState<EditorState>(() => toEditorState(storage.read()));
  const [status, setStatus] = useState('');
  const [error, setError] = useState<SaveError>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingRef = useRef(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const pageHeadingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogHeadingRef = useRef<HTMLHeadingElement>(null);
  const wasDialogOpenRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const summaryId = useId();

  const data = editor.kind === 'readable' ? editor.data : null;
  const spent = data === null ? 0 : sumLevels(data.upgrades);
  const resetDisabled = spent === 0;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (confirmOpen) {
      if (!dialog.open && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }

      dialogHeadingRef.current?.focus({ preventScroll: true });
    } else if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    }
  }, [confirmOpen]);

  useEffect(() => {
    if (wasDialogOpenRef.current && !confirmOpen) {
      resetButtonRef.current?.focus({ preventScroll: true });
    }

    wasDialogOpenRef.current = confirmOpen;
  }, [confirmOpen]);

  const beginAction = (): boolean => {
    if (pendingRef.current) {
      return false;
    }

    pendingRef.current = true;
    setPending(true);
    return true;
  };

  const endAction = (): void => {
    pendingRef.current = false;
    setPending(false);
  };

  const focusReadError = (): void => {
    pageHeadingRef.current?.focus({ preventScroll: true });
  };

  const handlePurchase = (key: UpgradeKey): void => {
    if (pendingRef.current) {
      return;
    }

    const definition = UPGRADE_DEFINITIONS[key];

    if (!beginAction()) {
      return;
    }

    setError(null);
    setStatus('SAVING…');

    const read = storage.read();
    const result = purchaseUpgrade(read, key, new Date().toISOString());

    if (result.kind === 'ready') {
      const written = storage.write(result.envelope);

      endAction();

      if (!written) {
        setStatus('');
        setError('purchase');
        return;
      }

      setEditor({ kind: 'readable', data: result.data });
      setStatus(purchaseStatus(key, definition, result.data));
      return;
    }

    endAction();

    if (result.kind === 'unreadable' || result.kind === 'unavailable') {
      setEditor({ kind: result.kind });
      setStatus('');
      focusReadError();
      return;
    }

    if (result.kind === 'max-level') {
      setStatus(
        `${definition.label.toUpperCase()} IS AT MAXIMUM (${UPGRADE_MAX_LEVELS[key]}/${UPGRADE_MAX_LEVELS[key]}).`,
      );
      return;
    }

    if (result.kind === 'insufficient-points') {
      setStatus(`NOT ENOUGH BLUE POINTS. 1 REQUIRED, ${formatCount(balanceOf(read))} BANKED.`);
      return;
    }

    setStatus('THIS NODE IS LOCKED.');
  };

  const openReset = (): void => {
    if (pendingRef.current || data === null) {
      return;
    }

    if (spent === 0) {
      setStatus('NO LEVELS TO RESET.');
      return;
    }

    setError(null);
    setStatus('');
    setConfirmOpen(true);
  };

  const cancelReset = (): void => {
    if (pendingRef.current) {
      return;
    }

    setError(null);
    setConfirmOpen(false);
  };

  const confirmReset = (): void => {
    if (pendingRef.current) {
      return;
    }

    if (!beginAction()) {
      return;
    }

    setError(null);
    setStatus('SAVING…');

    const read = storage.read();
    const result = resetUpgrades(read, new Date().toISOString());

    if (result.kind === 'ready') {
      const written = storage.write(result.envelope);

      endAction();

      if (!written) {
        setStatus('');
        setError('reset');
        return;
      }

      setEditor({ kind: 'readable', data: result.data });
      setStatus(`SKILLS RESET. ${formatCount(result.data.bluePoints)} BLUE POINTS AVAILABLE.`);
      setConfirmOpen(false);
      return;
    }

    endAction();

    if (result.kind === 'unreadable' || result.kind === 'unavailable') {
      setEditor({ kind: result.kind });
      setStatus('');
      setConfirmOpen(false);
      focusReadError();
      return;
    }

    if (result.kind === 'no-upgrades') {
      setEditor(toEditorState(read));
      setStatus('NO LEVELS TO RESET.');
      setConfirmOpen(false);
      return;
    }

    setStatus('SKILLS COULD NOT BE RESET.');
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip">
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionLabel tone="cyan" className="sm:flex-1">
            PROGRESSION // SKILL TREE
          </SectionLabel>
          <Link
            to="/"
            className="inline-flex min-h-11 shrink-0 items-center font-mono text-[0.6rem] tracking-[0.2em] text-muted uppercase transition-colors hover:text-cyan"
          >
            <span aria-hidden="true">← </span>BACK TO TITLE
          </Link>
        </div>

        <h1
          ref={pageHeadingRef}
          tabIndex={-1}
          className="mt-4 font-hero text-[clamp(3.5rem,9vw,7rem)] leading-[0.82] tracking-[-0.02em] text-ink uppercase focus:outline-none"
        >
          SKILL TREE
        </h1>
        <p className="mt-3 max-w-2xl font-body text-lg leading-snug text-muted">
          Spend banked blue points on permanent upgrades. Every level costs 1 blue point. Levels are
          add-only; the only way to remove them is Reset Skills. Changes apply to your next run.
        </p>

        {data === null ? (
          <ErrorPanel isUnreadable={editor.kind === 'unreadable'} />
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-start">
            <BalancePanel data={data} />
            {data.bluePoints === 0 ? <EmptyCallout spent={spent} /> : <SavedLocallyPanel />}
          </div>
        )}

        <TreePanel
          data={data}
          pending={pending}
          status={status}
          error={error}
          spent={spent}
          resetDisabled={resetDisabled}
          resetButtonRef={resetButtonRef}
          onPurchase={handlePurchase}
          onOpenReset={openReset}
        />

        <BossCurrencyStrip />

        <footer className="mt-8 border-t border-line pt-4">
          <div className="flex flex-col gap-2 font-mono text-[0.55rem] tracking-[0.2em] text-muted uppercase sm:flex-row sm:items-center sm:justify-between">
            <p>SHAPEBOUND // SKILLS // ADD-ONLY TREE</p>
            <p>1 BLUE POINT PER LEVEL // RESET CLEARS ALL</p>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center font-mono text-[0.62rem] tracking-[0.18em] text-muted uppercase transition-colors hover:text-cyan"
            >
              BACK TO TITLE
            </Link>
            {data === null ? null : (
              <Link
                to="/play"
                className="inline-flex min-h-11 items-center font-mono text-[0.62rem] tracking-[0.18em] text-muted uppercase transition-colors hover:text-cyan"
              >
                START A RUN
              </Link>
            )}
          </div>
        </footer>
      </div>

      <ResetDialog
        dialogRef={dialogRef}
        headingRef={dialogHeadingRef}
        titleId={titleId}
        descriptionId={descriptionId}
        summaryId={summaryId}
        spent={spent}
        balance={data?.bluePoints ?? 0}
        pending={pending}
        error={error === 'reset'}
        onCancel={cancelReset}
        onConfirm={confirmReset}
      />
    </div>
  );
}

interface BalancePanelProps {
  readonly data: ProgressionData;
}

function BalancePanel({ data }: BalancePanelProps) {
  const points = formatCount(data.bluePoints);
  const bestTime = formatElapsed(data.bestTimeMs);

  return (
    <Panel tone="default" className="p-5 sm:p-6" data-testid="skill-balance-panel">
      <p className="font-mono text-[0.58rem] tracking-[0.2em] text-cyan uppercase">
        /// BALANCE // LOCAL SAVE
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase">
        BLUE POINTS
      </h2>

      <div
        role="group"
        aria-label={`Saved blue points: ${points}`}
        className="mt-4 flex flex-wrap items-center gap-3"
      >
        <span aria-hidden="true" className="size-3 shrink-0 bg-survival clip-diamond" />
        <p
          data-testid="skill-balance"
          className="font-mono text-[clamp(2rem,7vw,5rem)] leading-none text-ink tabular-nums"
        >
          <GroupedInteger value={data.bluePoints} />
        </p>
      </div>

      <p className="mt-3 font-mono text-[0.55rem] leading-relaxed tracking-[0.16em] text-muted uppercase">
        SAVED BALANCE — BANKED ACROSS COMPLETED RUNS
      </p>

      <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-4 border-t border-line pt-4">
        <div>
          <dt className="font-mono text-[0.55rem] tracking-[0.18em] text-muted uppercase">
            BEST TIME
          </dt>
          <dd
            data-testid="skill-best-time"
            className="mt-1 font-mono text-[1.15rem] leading-none text-ink tabular-nums"
          >
            {bestTime.text}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.55rem] tracking-[0.18em] text-muted uppercase">
            RUNS COMPLETED
          </dt>
          <dd
            data-testid="skill-run-count"
            className="mt-1 font-mono text-[1.15rem] leading-none text-ink tabular-nums"
          >
            <GroupedInteger value={data.runCount} />
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

function SavedLocallyPanel() {
  return (
    <Panel tone="default" className="p-5" data-testid="skill-status-panel">
      <p className="font-mono text-[0.58rem] tracking-[0.2em] text-cyan uppercase">
        /// LOCAL_SAVE
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase">
        SAVED LOCALLY
      </h2>
      <p className="mt-2 font-body text-sm leading-snug text-muted">
        These values live in this browser. Every level purchase and reset writes immediately.
        Nothing leaves the device.
      </p>
      <p className="mt-4 inline-flex items-center gap-2 border border-cyan/40 bg-cyan/5 px-2 py-1 font-mono text-[0.55rem] tracking-[0.16em] text-cyan uppercase">
        <span aria-hidden="true" className="size-1.5 shrink-0 bg-cyan" />
        LOCAL ONLY
      </p>
    </Panel>
  );
}

function EmptyCallout({ spent }: { readonly spent: number }) {
  const spentPoints = spent > 0;

  return (
    <Panel tone="default" className="p-5" data-testid="skill-empty-callout">
      <p className="font-mono text-[0.58rem] tracking-[0.2em] text-cyan uppercase">
        /// BALANCE // EMPTY
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase">
        {spentPoints ? '0 BLUE POINTS AVAILABLE' : 'NO POINTS BANKED YET'}
      </h2>
      <p className="mt-2 font-body text-sm leading-snug text-muted">
        {spentPoints
          ? 'Your points are in the tree. Complete a run to bank more, or reset to refund what you spent.'
          : 'Complete a run to bank the blue points you earn. Every level costs 1 blue point.'}
      </p>
      <div className="mt-5">
        <LinkButton to="/play" variant="primary" size="lg" className="w-full sm:w-auto">
          START A RUN
        </LinkButton>
      </div>
    </Panel>
  );
}

function ErrorPanel({ isUnreadable }: { readonly isUnreadable: boolean }) {
  const headingId = useId();
  const bodyId = useId();

  return (
    <div className="mt-8">
      <Panel
        tone="red"
        role="status"
        aria-live="polite"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        className="p-5 sm:p-6"
        data-testid="skill-error-panel"
      >
        <p className="font-mono text-[0.58rem] tracking-[0.2em] text-red uppercase">
          /// LOCAL_SAVE
        </p>
        <h2
          id={headingId}
          className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase"
        >
          {isUnreadable ? 'SAVED PROGRESS COULD NOT BE READ' : 'LOCAL STORAGE IS UNAVAILABLE'}
        </h2>
        <p id={bodyId} className="mt-2 max-w-2xl font-body text-sm leading-snug text-muted">
          {isUnreadable
            ? 'The local save is not readable. Nothing has been overwritten. Open Settings to reset local data; after the reset, the next death can write a fresh record.'
            : 'This browser is blocking local storage. Progress cannot be read or saved, so a new run cannot start until storage is available.'}
        </p>
        {isUnreadable ? (
          <div className="mt-5 flex flex-col gap-1 sm:items-start">
            <LinkButton to="/settings" variant="secondary" size="lg" className="w-full sm:w-auto">
              Open Settings
            </LinkButton>
            <p className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">
              RESET IN SETTINGS
            </p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

interface TreePanelProps {
  readonly data: ProgressionData | null;
  readonly pending: boolean;
  readonly status: string;
  readonly error: SaveError;
  readonly spent: number;
  readonly resetDisabled: boolean;
  readonly resetButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onPurchase: (key: UpgradeKey) => void;
  readonly onOpenReset: () => void;
}

function TreePanel({
  data,
  pending,
  status,
  error,
  spent,
  resetDisabled,
  resetButtonRef,
  onPurchase,
  onOpenReset,
}: TreePanelProps) {
  const resetHelperId = useId();

  return (
    <Panel tone="default" className="mt-8 p-5 sm:p-6" data-testid="skill-tree">
      <SectionLabel tone="cyan">SKILL_TREE // ADD-ONLY</SectionLabel>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase">
        UPGRADE TREE
      </h2>
      <p className="mt-2 max-w-2xl font-body text-sm leading-snug text-muted">
        Each level costs 1 blue point. Select a known node to add one level. Nodes are independent;
        Charge Speed only has an effect once Reflect Charges is above 0.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {BRANCHES.map((branch, branchIndex) => {
          const headingId = `skills-branch-${branchIndex}`;

          return (
            <section key={branch.label} aria-labelledby={headingId}>
              <h3
                id={headingId}
                className="font-mono text-[0.6rem] tracking-[0.18em] text-cyan uppercase"
              >
                {branch.label}
              </h3>
              <ol className="mt-3 grid gap-2">
                {branch.nodes.map((key) => (
                  <li key={key}>
                    <UpgradeNode
                      nodeKey={key}
                      data={data}
                      pending={pending}
                      onPurchase={onPurchase}
                    />
                  </li>
                ))}
                {Array.from({ length: branch.locked }, (_, index) => (
                  <li
                    key={`${branch.label}-locked-${index}`}
                    data-testid="locked-node"
                    className="flex min-h-11 items-center justify-between gap-3 border border-dashed border-line bg-void/40 px-3 py-2 text-muted"
                  >
                    <span className="font-mono text-[0.58rem] tracking-[0.16em] uppercase">
                      FUTURE NODE
                    </span>
                    <span className="border border-line-bright px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.16em] text-muted uppercase">
                      LOCKED
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      {data === null ? null : (
        <div
          id="skills-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-4 min-h-6 font-mono text-[0.58rem] tracking-[0.16em] text-cyan uppercase"
        >
          {status}
        </div>
      )}

      {error === 'purchase' ? <SaveFailedAlert kind="purchase" /> : null}

      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
        {data === null ? null : (
          <div className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">
            <p>
              SPENT: {spent} // BANKED: {formatCount(data.bluePoints)}
            </p>
            <p className="mt-1">RESET REFUND: UP TO {spent} BLUE POINTS</p>
          </div>
        )}

        {data === null ? (
          <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">
            SAVE NOT READABLE // RESET UNAVAILABLE
          </p>
        ) : (
          <div className="flex flex-col gap-1 sm:items-end">
            <Button
              ref={resetButtonRef}
              variant="secondary"
              size="md"
              aria-disabled={resetDisabled || pending ? 'true' : undefined}
              aria-describedby={resetHelperId}
              onClick={onOpenReset}
              className={cx(
                'min-h-11 w-full sm:w-auto',
                (resetDisabled || pending) && 'opacity-50',
              )}
            >
              Reset Skills
            </Button>
            <p
              id={resetHelperId}
              className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase"
            >
              {resetDisabled
                ? 'NO LEVELS PURCHASED // NOTHING TO REFUND'
                : `CLEARS ALL 7 LEVELS // REFUNDS UP TO ${spent} POINTS`}
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

interface UpgradeNodeProps {
  readonly nodeKey: UpgradeKey;
  readonly data: ProgressionData | null;
  readonly pending: boolean;
  readonly onPurchase: (key: UpgradeKey) => void;
}

function UpgradeNode({ nodeKey, data, pending, onPurchase }: UpgradeNodeProps) {
  const definition = UPGRADE_DEFINITIONS[nodeKey];
  const max = UPGRADE_MAX_LEVELS[nodeKey];

  if (data === null) {
    return (
      <div className="grid min-h-[4.75rem] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border border-line bg-panel-raised/30 px-3 py-2 text-muted">
        <span className="font-display text-[0.82rem] font-semibold tracking-[0.06em] uppercase">
          {definition.label}
        </span>
        <span className="font-mono text-[0.72rem] tracking-[0.08em]">—</span>
        <span className="font-mono text-[0.52rem] tracking-[0.14em] uppercase">READ BLOCKED</span>
      </div>
    );
  }

  const level = data.upgrades[nodeKey];
  const atMax = level >= max;
  const effect = definition.effect(level);
  const label = atMax
    ? `${definition.label} — level ${level} of ${max}, maximum level reached`
    : `${definition.label} — level ${level} of ${max}, ${effect} — add level, 1 blue point`;
  const disabled = atMax || pending;

  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled ? 'true' : undefined}
      onClick={() => {
        if (!pending) {
          onPurchase(nodeKey);
        }
      }}
      className={cx(
        'grid min-h-[4.75rem] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border border-line bg-panel-raised/60 px-3 py-2 text-left transition-colors duration-150 ease-snap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan active:translate-y-0.5',
        pending && 'opacity-60',
        atMax ? 'cursor-default' : 'hover:border-cyan/60 hover:bg-cyan/5',
      )}
    >
      <span className="font-display text-[0.82rem] leading-tight font-semibold tracking-[0.06em] text-ink uppercase">
        {definition.label}
      </span>
      <span className="font-mono text-[0.72rem] tracking-[0.08em] text-ink tabular-nums">
        {level}/{max}
      </span>
      <span className="font-mono text-[0.52rem] tracking-[0.14em] text-muted uppercase">
        {effect}
      </span>
      {atMax ? (
        <span className="justify-self-end border border-cyan/50 bg-cyan/5 px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.16em] text-cyan uppercase">
          MAX
        </span>
      ) : (
        <span className="flex items-center gap-1.5 justify-self-end font-mono text-[0.55rem] tracking-[0.14em] text-muted uppercase">
          <span aria-hidden="true" className="size-1.5 shrink-0 bg-survival clip-diamond" />
          +1 PT
        </span>
      )}
      <span aria-hidden="true" className="col-span-2 flex gap-1">
        {Array.from({ length: max }, (_, index) => (
          <span key={index} className={cx('h-0.5 w-3', index < level ? 'bg-cyan' : 'bg-line')} />
        ))}
      </span>
    </button>
  );
}

function SaveFailedAlert({ kind }: { readonly kind: 'purchase' | 'reset' }) {
  return (
    <div
      id="skills-error"
      role="alert"
      className="mt-4 border-l-2 border-red pl-3"
      data-testid="skill-save-error"
    >
      <p className="font-mono text-[0.62rem] leading-relaxed tracking-[0.14em] text-red uppercase">
        {kind === 'purchase' ? 'SAVE FAILED — LEVEL NOT CHANGED' : 'SAVE FAILED — SKILLS NOT RESET'}
      </p>
      <p className="mt-2 font-body text-sm leading-snug text-muted">
        The stored record is unchanged. TRY AGAIN when you are ready.
      </p>
    </div>
  );
}

function BossCurrencyStrip() {
  return (
    <div className="mt-4 border border-line bg-void/40 p-3">
      <ul aria-label="Currency roles" className="grid gap-2">
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-line bg-panel-raised/60 px-3 py-2">
          <span aria-hidden="true" className="size-2.5 shrink-0 bg-survival clip-diamond" />
          <span className="font-mono text-[0.6rem] tracking-[0.14em] text-ink uppercase">
            BLUE — SURVIVAL POINTS (BANKED HERE)
          </span>
        </li>
        {RESERVED_BOSS_CURRENCIES.map((currency) => (
          <li
            key={currency.label}
            data-testid="reserved-currency-row"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-line bg-panel-raised/60 px-3 py-2"
          >
            <span
              aria-hidden="true"
              className={cx('size-2.5 shrink-0 clip-diamond', currency.diamondClassName)}
            />
            <span className="font-mono text-[0.6rem] tracking-[0.14em] text-ink uppercase">
              {currency.label} — 0 — RESERVED
            </span>
            <span className="ml-auto font-mono text-[0.5rem] tracking-[0.14em] text-muted uppercase">
              NOT YET AVAILABLE IN THIS BUILD
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ResetDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly titleId: string;
  readonly descriptionId: string;
  readonly summaryId: string;
  readonly spent: number;
  readonly balance: number;
  readonly pending: boolean;
  readonly error: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

function ResetDialog({
  dialogRef,
  headingRef,
  titleId,
  descriptionId,
  summaryId,
  spent,
  balance,
  pending,
  error,
  onCancel,
  onConfirm,
}: ResetDialogProps) {
  const capNote = balance + spent > MAX_BLUE_POINTS;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${summaryId}`}
      onCancel={(event) => {
        event.preventDefault();

        if (!pending) {
          onCancel();
        }
      }}
      className="fixed inset-0 z-[90] m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink"
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-void/85" />

      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="w-[min(92vw,28rem)]">
          <Panel
            tone="cyan"
            className="max-h-[calc(100svh-2rem)] w-full overflow-y-auto overscroll-contain p-5 sm:p-6"
          >
            <p className="font-mono text-[0.58rem] tracking-[0.2em] text-red uppercase">
              /// CONFIRM // RESET SKILLS
            </p>
            <h2
              ref={headingRef}
              id={titleId}
              tabIndex={-1}
              className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase focus:outline-none"
            >
              RESET ALL SKILLS?
            </h2>
            <p id={descriptionId} className="mt-2 font-body text-sm leading-snug text-muted">
              This clears all seven node levels. Their total cost is refunded to your blue-point
              balance. Best time, run count, and boss currencies are not changed. This cannot be
              undone; levels must be purchased again.
            </p>

            <dl id={summaryId} className="mt-4 grid grid-cols-2 gap-3 border-y border-line py-3">
              <div>
                <dt className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">
                  LEVELS
                </dt>
                <dd className="mt-1 font-mono text-[1.15rem] leading-none text-ink tabular-nums">
                  {spent}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">
                  REFUND
                </dt>
                <dd className="mt-1 flex items-center gap-2 font-mono text-[1.15rem] leading-none text-ink tabular-nums">
                  <span aria-hidden="true" className="size-2 shrink-0 bg-survival clip-diamond" />
                  UP TO {spent}
                </dd>
              </div>
            </dl>

            {capNote ? (
              <p className="mt-3 font-mono text-[0.55rem] leading-relaxed tracking-[0.14em] text-acid uppercase">
                BLUE POINTS ARE CAPPED. THE BALANCE WILL STOP AT THE CAP; THE EXCESS REFUND IS
                DISCARDED.
              </p>
            ) : null}

            {error ? <SaveFailedAlert kind="reset" /> : null}

            <div className="mt-5 flex flex-col gap-2 min-[480px]:flex-row">
              <Button
                variant="ghost"
                size="lg"
                onClick={onCancel}
                className="w-full min-[480px]:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="lg"
                aria-disabled={pending ? 'true' : undefined}
                onClick={onConfirm}
                className="w-full min-[480px]:w-auto"
              >
                Confirm reset
              </Button>
            </div>

            <p className="mt-3 font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">
              CANCEL LEAVES THE TREE UNCHANGED
            </p>
          </Panel>
        </div>
      </div>
    </dialog>
  );
}

function toEditorState(read: ProgressionRead): EditorState {
  if (read.kind === 'unreadable') {
    return { kind: 'unreadable' };
  }

  if (read.kind === 'unavailable') {
    return { kind: 'unavailable' };
  }

  return {
    kind: 'readable',
    data: read.kind === 'valid' ? read.data : createEmptyProgression(),
  };
}

function balanceOf(read: ProgressionRead): number {
  return read.kind === 'valid' ? read.data.bluePoints : 0;
}

function purchaseStatus(
  key: UpgradeKey,
  definition: UpgradeDefinition,
  data: ProgressionData,
): string {
  const max = UPGRADE_MAX_LEVELS[key];
  const level = data.upgrades[key];
  const label = definition.label.toUpperCase();
  const balance = formatCount(data.bluePoints);

  return level >= max
    ? `${label} MAXED AT ${max}/${max}. ${balance} BLUE POINTS LEFT.`
    : `${label} RAISED TO ${level}/${max}. ${balance} BLUE POINTS LEFT.`;
}

function sumLevels(levels: UpgradeLevels): number {
  return UPGRADE_KEYS.reduce((total, key) => total + levels[key], 0);
}

function curveAt(curve: readonly number[], level: number): number {
  return curve[level] ?? curve[0] ?? 0;
}

function formatSeconds(ms: number): string {
  return (ms / 1_000).toFixed(1);
}

function GroupedInteger({ value }: { readonly value: number }) {
  const groups = formatCount(value).split(',');

  return groups.map((group, index) => (
    <Fragment key={`${group}-${index}`}>
      {index === 0 ? null : (
        <>
          ,<wbr data-testid="skill-balance-break" />
        </>
      )}
      {group}
    </Fragment>
  ));
}

function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
