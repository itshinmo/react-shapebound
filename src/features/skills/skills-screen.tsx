import { Fragment, useId, useState } from 'react';
import { Link } from 'react-router';

import { readProgression } from '@/features/play/progression-storage';
import {
  createEmptyProgression,
  type ProgressionData,
  type ProgressionRead,
} from '@/game/progression';
import { formatElapsed } from '@/game/run';
import { cx } from '@/shared/lib/cx';
import { getBrowserStorage } from '@/shared/lib/storage';
import { LinkButton } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/panel';
import { SectionLabel } from '@/shared/ui/section-label';

const BRANCHES = [
  { label: 'BRANCH_01', nodes: ['NODE_01', 'NODE_02', 'NODE_03'] },
  { label: 'BRANCH_02', nodes: ['NODE_04', 'NODE_05', 'NODE_06'] },
  { label: 'BRANCH_03', nodes: ['NODE_07', 'NODE_08', 'NODE_09'] },
] as const;

const RESERVED_BOSS_CURRENCIES = [
  { label: 'PURPLE', diamondClassName: 'bg-boss-purple' },
  { label: 'GREEN', diamondClassName: 'bg-boss-green' },
  { label: 'ORANGE', diamondClassName: 'bg-boss-orange' },
] as const;

export function SkillsScreen() {
  const [read] = useState<ProgressionRead>(() => readProgression(getBrowserStorage()));
  const data =
    read.kind === 'valid' ? read.data : read.kind === 'none' ? createEmptyProgression() : null;
  const canStartRun = data !== null && data.bluePoints === 0;

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

        <h1 className="mt-4 font-hero text-[clamp(3.5rem,9vw,7rem)] leading-[0.82] tracking-[-0.02em] text-ink uppercase">
          SKILL TREE
        </h1>
        <p className="mt-3 max-w-2xl font-body text-lg leading-snug text-muted">
          Saved progression from completed runs. Upgrades are not available in this build.
        </p>

        {data === null ? (
          <ErrorPanel isUnreadable={read.kind === 'unreadable'} />
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-start">
            <BalancePanel data={data} />
            {data.bluePoints === 0 ? <EmptyCallout /> : <SavedLocallyPanel />}
          </div>
        )}

        <NodeMap />

        <footer className="mt-8 border-t border-line pt-4">
          <div className="flex flex-col gap-2 font-mono text-[0.55rem] tracking-[0.2em] text-muted uppercase sm:flex-row sm:items-center sm:justify-between">
            <p>SHAPEBOUND // SKILLS // PLACEHOLDER</p>
            <p>NO UPGRADES IN THIS BUILD</p>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center font-mono text-[0.62rem] tracking-[0.18em] text-muted uppercase transition-colors hover:text-cyan"
            >
              BACK TO TITLE
            </Link>
            {canStartRun ? (
              <Link
                to="/play"
                className="inline-flex min-h-11 items-center font-mono text-[0.62rem] tracking-[0.18em] text-muted uppercase transition-colors hover:text-cyan"
              >
                START A RUN
              </Link>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}

function BalancePanel({ data }: { readonly data: ProgressionData }) {
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
        These values live in this browser. Nothing leaves the device.
      </p>
      <p className="mt-4 inline-flex items-center gap-2 border border-cyan/40 bg-cyan/5 px-2 py-1 font-mono text-[0.55rem] tracking-[0.16em] text-cyan uppercase">
        <span aria-hidden="true" className="size-1.5 shrink-0 bg-cyan" />
        LOCAL ONLY
      </p>
    </Panel>
  );
}

function EmptyCallout() {
  return (
    <Panel tone="default" className="p-5" data-testid="skill-empty-callout">
      <p className="font-mono text-[0.58rem] tracking-[0.2em] text-cyan uppercase">
        /// BALANCE // EMPTY
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase">
        NO POINTS BANKED YET
      </h2>
      <p className="mt-2 font-body text-sm leading-snug text-muted">
        Complete a run to bank the blue points you earn. Upgrades are not available in this build.
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
            : 'This browser is blocking local storage. Progress cannot be read or saved. The game still runs, but nothing will persist.'}
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

function NodeMap() {
  return (
    <Panel tone="default" className="mt-8 p-5 sm:p-6" data-testid="skill-map">
      <SectionLabel tone="cyan">NODE_MAP // LOCKED</SectionLabel>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink uppercase">
        PROGRESSION MAP
      </h2>
      <p className="mt-2 max-w-2xl font-body text-sm leading-snug text-muted">
        A preview of the planned node tree. No nodes can be unlocked in this build.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {BRANCHES.map((branch) => {
          const headingId = `skills-${branch.label.toLowerCase()}`;

          return (
            <section key={branch.label} aria-labelledby={headingId}>
              <h3
                id={headingId}
                className="font-mono text-[0.6rem] tracking-[0.18em] text-cyan uppercase"
              >
                {branch.label}
              </h3>
              <div className="relative mt-3">
                <span
                  aria-hidden="true"
                  className="absolute top-5 bottom-5 left-[calc(0.75rem+0.3125rem)] w-px -translate-x-1/2 bg-line"
                />
                <ol className="grid gap-2">
                  {branch.nodes.map((node) => (
                    <li
                      key={node}
                      data-testid="skill-node"
                      className="relative flex min-h-11 items-center gap-3 border border-line bg-panel-raised/60 px-3 py-2"
                    >
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rotate-45 border border-line-bright"
                      />
                      <span className="font-mono text-[0.62rem] tracking-[0.14em] text-ink uppercase">
                        {node}
                      </span>
                      <span className="ml-auto border border-line-bright px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.16em] text-muted uppercase">
                        LOCKED
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 border border-line bg-void/40 p-3">
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
    </Panel>
  );
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
