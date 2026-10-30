import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createEmptyProgression } from '@/game/progression';
import type { ProgressionData } from '@/game/progression';
import type { CommitStatus } from '@/game/run';
import { renderWithProviders } from '@/test/render';

import { RunOverOverlay } from './run-over-overlay';

import type { ComponentProps } from 'react';

const UNREADABLE_HEADING = 'SAVED PROGRESS COULD NOT BE READ — THIS RUN WAS NOT SAVED';
const UNREADABLE_BODY =
  "The existing local save is unreadable. Nothing was written or overwritten, so this run's points and time are not saved. Open Settings to reset local data; after the reset, the next death can write a fresh record. Navigating away (skill tree, settings, or title) or starting a new run discards this run's unsaved points. A new run cannot start until the save is reset.";
const UNAVAILABLE_HEADING = 'LOCAL STORAGE IS UNAVAILABLE — THIS RUN WAS NOT SAVED';
const UNAVAILABLE_BODY =
  "This browser is blocking local storage. Nothing was written. A reset cannot repair an absent storage API. Navigating away (skill tree or title) or starting a new run discards this run's unsaved points.";

function makeData(bluePoints: number): ProgressionData {
  return { ...createEmptyProgression(), bluePoints };
}

function renderOverlay(overrides: Partial<ComponentProps<typeof RunOverOverlay>> = {}) {
  const props: ComponentProps<typeof RunOverOverlay> = {
    finalElapsedMs: 60_000,
    commit: 'saved',
    committedData: makeData(60),
    onRetry: vi.fn(),
    onRetryCommit: vi.fn(),
    ...overrides,
  };

  return {
    ...renderWithProviders(<RunOverOverlay {...props} />),
    onRetry: props.onRetry,
    onRetryCommit: props.onRetryCommit,
  };
}

function RetrySaveHarness({ nextCommit }: { readonly nextCommit: 'saved' | 'failed' }) {
  const [commit, setCommit] = useState<CommitStatus>('failed');

  return (
    <RunOverOverlay
      finalElapsedMs={1_000}
      commit={commit}
      committedData={commit === 'saved' ? makeData(1) : null}
      onRetry={() => undefined}
      onRetryCommit={() => {
        setCommit(nextCommit);
      }}
    />
  );
}

function SuspensionHarness() {
  const [suspended, setSuspended] = useState(false);

  return (
    <>
      <RunOverOverlay
        finalElapsedMs={60_000}
        commit="saved"
        committedData={makeData(60)}
        onRetry={() => undefined}
        onRetryCommit={() => undefined}
        suspended={suspended}
      />
      <button
        type="button"
        onClick={() => {
          setSuspended((value) => !value);
        }}
      >
        Toggle suspension
      </button>
    </>
  );
}

describe('RunOverOverlay', () => {
  it('opens a modal dialog labelled by the run-over heading and focused on mount', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    renderOverlay();

    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { level: 2, name: 'SIGNAL LOST' });
    const summary = screen.getByTestId('run-over-summary');
    const status = screen.getByRole('status');

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
    expect(dialog).toHaveAttribute('aria-describedby', `${summary.id} ${status.id}`);
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(heading).toHaveFocus();
    expect(screen.getByText('/// RUN TERMINATED')).toBeInTheDocument();
    expect(screen.getByText('THE RUN IS OVER. THE CLOCK HAS STOPPED.')).toBeInTheDocument();
    expect(screen.getByText('NO CONTINUE // NO MID-RUN SAVE')).toBeInTheDocument();
  });

  it('keeps the dialog open when Escape or cancel fires', async () => {
    const user = userEvent.setup();
    renderOverlay();

    const dialog = screen.getByRole('dialog');
    const cancel = new Event('cancel', { bubbles: true, cancelable: true });

    fireEvent(dialog, cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog).toHaveAttribute('open');

    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');
  });

  it.each([
    [999, '00:00:99'],
    [1_000, '00:01:00'],
    [59_999, '00:59:99'],
    [60_000, '01:00:00'],
    [6_000_000, '100:00:00'],
  ] as const)('shows the truncated final time for %i ms', (finalElapsedMs, expected) => {
    renderOverlay({ finalElapsedMs, committedData: makeData(0) });

    const group = screen.getByRole('group', { name: 'Final time' });

    expect(within(group).getByText(expected)).toBeInTheDocument();
  });

  it.each([
    [999, '0'],
    [1_000, '1'],
  ] as const)('shows the final points for a %i ms run', (finalElapsedMs, expected) => {
    renderOverlay({ finalElapsedMs, committedData: makeData(Number(expected)) });

    const group = screen.getByRole('group', { name: 'Blue points' });

    expect(within(group).getByText(expected)).toBeInTheDocument();
  });

  it('comma-groups the final points', () => {
    renderOverlay({ finalElapsedMs: 123_456_789, committedData: makeData(0) });

    const group = screen.getByRole('group', { name: 'Blue points' });

    expect(within(group).getByText('123,456')).toBeInTheDocument();
  });

  it('shows the saved balance with comma grouping', () => {
    renderOverlay({ finalElapsedMs: 12_345, committedData: makeData(1_234_567) });

    expect(screen.getByText('PROGRESS SAVED')).toBeInTheDocument();
    expect(screen.getByText('SAVED BALANCE: 1,234,567')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();
  });

  it('shows NO POINTS THIS RUN for a zero-point saved death', () => {
    renderOverlay({ finalElapsedMs: 999, committedData: makeData(42) });

    expect(screen.getByText('NO POINTS THIS RUN')).toBeInTheDocument();
    expect(screen.queryByText(/SAVED BALANCE/)).not.toBeInTheDocument();
  });

  it('shows the pending status and temporarily disables Open Skill Tree', async () => {
    const user = userEvent.setup();
    renderOverlay({ commit: 'pending', committedData: null });

    const status = screen.getByRole('status');
    const skillTree = screen.getByRole('link', { name: 'Open Skill Tree' });
    const pendingReason = screen.getByText('FINISHING SAVE…');

    expect(status).toHaveTextContent('COMMITTING PROGRESS…');
    expect(skillTree).toHaveAttribute('aria-disabled', 'true');
    expect(skillTree).toHaveAttribute('aria-describedby', pendingReason.id);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to title' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();

    await user.click(skillTree);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the failed row, keeps the run points, and retries the latched save', async () => {
    const user = userEvent.setup();
    const { onRetryCommit } = renderOverlay({
      finalElapsedMs: 12_000,
      commit: 'failed',
      committedData: null,
    });

    const failure = screen.getByRole('alert');
    const skillTree = screen.getByRole('link', { name: 'Open Skill Tree' });
    const retrySave = screen.getByRole('button', { name: 'Retry save' });
    const points = screen.getByRole('group', { name: 'Blue points' });

    expect(failure).toHaveTextContent('SAVE FAILED — POINTS NOT SAVED');
    expect(failure).toHaveTextContent('STARTING A NEW RUN OR LEAVING DISCARDS THESE POINTS.');
    expect(skillTree).toHaveAttribute('aria-describedby', failure.id);
    expect(screen.getByText('SAME TOTAL // NOT ADDED AGAIN')).toBeInTheDocument();
    expect(within(points).getByText('12')).toBeInTheDocument();
    expect(screen.queryByText(/SAVED BALANCE/)).not.toBeInTheDocument();

    await user.click(retrySave);

    expect(onRetryCommit).toHaveBeenCalledTimes(1);
  });

  it('shows the unreadable warning, the settings route, and no save retry', () => {
    renderOverlay({ commit: 'unreadable', committedData: null });

    const warning = screen.getByRole('alert');
    const skillTree = screen.getByRole('link', { name: 'Open Skill Tree' });
    const settings = screen.getByRole('link', { name: 'Open Settings' });

    const retry = screen.getByRole('button', { name: 'Retry' });
    const helper = screen.getByText('RE-CHECKS LOCAL SAVE // NEW RUN MAY BE BLOCKED');

    expect(warning).toHaveTextContent(UNREADABLE_HEADING);
    expect(warning).toHaveTextContent(UNREADABLE_BODY);
    expect(screen.getByText('NOT SAVED // UNREADABLE SAVE')).toBeInTheDocument();
    expect(skillTree).toHaveAttribute('aria-describedby', warning.id);
    expect(settings).toHaveAttribute('href', '/settings');
    expect(settings).toHaveAttribute('aria-describedby', warning.id);
    expect(retry).toHaveAttribute('aria-describedby', `${helper.id} ${warning.id}`);
    expect(screen.getByText('RESET IN SETTINGS')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();
    expect(screen.queryByText(/SAVED BALANCE/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Blue points' })).toBeInTheDocument();
  });

  it('shows the unavailable warning without a save retry or settings route', () => {
    renderOverlay({ commit: 'unavailable', committedData: null });

    const warning = screen.getByRole('alert');
    const skillTree = screen.getByRole('link', { name: 'Open Skill Tree' });
    const retry = screen.getByRole('button', { name: 'Retry' });
    const helper = screen.getByText('RE-CHECKS LOCAL SAVE // NEW RUN MAY BE BLOCKED');

    expect(warning).toHaveTextContent(UNAVAILABLE_HEADING);
    expect(warning).toHaveTextContent(UNAVAILABLE_BODY);
    expect(screen.getByText('NOT SAVED // STORAGE UNAVAILABLE')).toBeInTheDocument();
    expect(skillTree).toHaveAttribute('aria-describedby', warning.id);
    expect(retry).toHaveAttribute('aria-describedby', `${helper.id} ${warning.id}`);
    expect(screen.queryByRole('link', { name: 'Open Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Blue points' })).toBeInTheDocument();
  });

  it.each(['saved', 'failed'] as const)(
    'does not add the new-run helper in the %s commit state',
    (commit) => {
      renderOverlay({ commit, committedData: commit === 'saved' ? makeData(1) : null });

      expect(
        screen.queryByText('RE-CHECKS LOCAL SAVE // NEW RUN MAY BE BLOCKED'),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).not.toHaveAttribute('aria-describedby');
    },
  );

  it('wires Retry, Open Skill Tree, and Back to title', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderOverlay();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Open Skill Tree' })).toHaveAttribute(
      'href',
      '/skills',
    );
    expect(screen.getByRole('link', { name: 'Back to title' })).toHaveAttribute('href', '/');
  });

  it.each(['saved', 'failed'] as const)(
    'focuses the status row after Retry save resolves to %s',
    async (nextCommit) => {
      const user = userEvent.setup();

      renderWithProviders(<RetrySaveHarness nextCommit={nextCommit} />);

      await user.click(screen.getByRole('button', { name: 'Retry save' }));

      const status =
        nextCommit === 'saved' ? screen.getByRole('status') : screen.getByRole('alert');

      await waitFor(() => {
        expect(status).toHaveFocus();
      });
    },
  );

  it('closes for portrait suspension and reopens with the heading focused', async () => {
    const user = userEvent.setup();
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');

    renderWithProviders(<SuspensionHarness />);

    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { level: 2, name: 'SIGNAL LOST' });

    expect(dialog).toHaveAttribute('open');
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(heading).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Toggle suspension' }));

    expect(dialog).not.toHaveAttribute('open');
    expect(heading).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle suspension' }));

    expect(dialog).toHaveAttribute('open');
    expect(showModal).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });
});
