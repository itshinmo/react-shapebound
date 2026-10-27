import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmptyProgression } from '@/game/progression';
import type { ProgressionData } from '@/game/progression';
import { SAVE_STORAGE_KEY, createSave, serializeSave } from '@/game/save';
import { renderWithProviders } from '@/test/render';

import { SkillsScreen } from './skills-screen';

const savedAt = '2026-10-26T12:00:00.000Z';

function seedSave(overrides: Partial<ProgressionData> = {}): void {
  const data = { ...createEmptyProgression(), ...overrides };

  window.localStorage.setItem(SAVE_STORAGE_KEY, serializeSave(createSave(data, savedAt)));
}

function renderSkills() {
  return renderWithProviders(<SkillsScreen />, { route: '/skills' });
}

describe('SkillsScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows base values and the empty callout when the save is missing', () => {
    renderSkills();

    expect(screen.getByRole('group', { name: 'Saved blue points: 0' })).toBeInTheDocument();
    expect(screen.getByTestId('skill-balance')).toHaveTextContent(/^0$/);
    expect(screen.getByTestId('skill-best-time')).toHaveTextContent(/^00:00:00$/);
    expect(screen.getByTestId('skill-run-count')).toHaveTextContent(/^0$/);
    expect(
      screen.getByRole('heading', { level: 2, name: 'NO POINTS BANKED YET' }),
    ).toBeInTheDocument();

    const callout = screen.getByTestId('skill-empty-callout');
    expect(within(callout).getByRole('link', { name: 'START A RUN' })).toHaveAttribute(
      'href',
      '/play',
    );
    expect(screen.getByTestId('skill-map')).toHaveTextContent('NODE_01');
    expect(screen.getByTestId('skill-map')).toHaveTextContent('NODE_09');
  });

  it('shows the saved balance, stats, and reserved rows for a valid positive save', () => {
    seedSave({
      bluePoints: 1_000_000_000,
      bestTimeMs: 123_456,
      runCount: 12_345,
      bossCurrencies: { purple: 9, green: 8, orange: 7 },
    });

    renderSkills();

    const balanceGroup = screen.getByRole('group', {
      name: 'Saved blue points: 1,000,000,000',
    });
    const balance = screen.getByTestId('skill-balance');

    expect(balanceGroup).toBeInTheDocument();
    expect(balance).toHaveTextContent(/^1,000,000,000$/);
    expect(within(balance).getAllByTestId('skill-balance-break')).toHaveLength(3);
    expect(screen.getByTestId('skill-best-time')).toHaveTextContent(/^02:03:45$/);
    expect(screen.getByTestId('skill-run-count')).toHaveTextContent(/^12,345$/);
    expect(screen.getByRole('heading', { level: 2, name: 'SAVED LOCALLY' })).toBeInTheDocument();
    expect(screen.getByText('LOCAL ONLY')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'START A RUN' })).not.toBeInTheDocument();

    const map = screen.getByTestId('skill-map');
    expect(within(map).getByText('PURPLE — 0 — RESERVED')).toBeInTheDocument();
    expect(within(map).getByText('GREEN — 0 — RESERVED')).toBeInTheDocument();
    expect(within(map).getByText('ORANGE — 0 — RESERVED')).toBeInTheDocument();
    expect(within(map).getAllByText('NOT YET AVAILABLE IN THIS BUILD')).toHaveLength(3);
  });

  it('keeps the real saved stats in the empty callout when the balance is zero', () => {
    seedSave({ bluePoints: 0, bestTimeMs: 5_000, runCount: 3 });

    renderSkills();

    expect(
      screen.getByRole('heading', { level: 2, name: 'NO POINTS BANKED YET' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('skill-best-time')).toHaveTextContent(/^00:05:00$/);
    expect(screen.getByTestId('skill-run-count')).toHaveTextContent(/^3$/);
    expect(screen.getAllByRole('link', { name: 'START A RUN' })).toHaveLength(2);
    expect(
      screen.queryByRole('heading', { level: 2, name: 'SAVED LOCALLY' }),
    ).not.toBeInTheDocument();
  });

  it('shows a single settings recovery route and no fabricated values for an unreadable save', () => {
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{not json');

    renderSkills();

    expect(
      screen.getByRole('heading', { level: 2, name: 'SAVED PROGRESS COULD NOT BE READ' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'The local save is not readable. Nothing has been overwritten.',
    );
    expect(screen.queryByRole('group', { name: /saved blue points/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'BLUE POINTS' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('BEST TIME')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-best-time')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-run-count')).not.toBeInTheDocument();

    const settingsLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/settings');
    expect(settingsLinks).toHaveLength(1);
    expect(settingsLinks[0]).toHaveAccessibleName('Open Settings');
    expect(screen.getByText('RESET IN SETTINGS')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'START A RUN' })).not.toBeInTheDocument();
    expect(screen.getByTestId('skill-map')).toHaveTextContent('NODE_01');
  });

  it('shows unavailable storage without offering settings as a repair', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    renderSkills();

    expect(
      screen.getByRole('heading', { level: 2, name: 'LOCAL STORAGE IS UNAVAILABLE' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'This browser is blocking local storage. Progress cannot be read or saved.',
    );
    expect(screen.queryByRole('group', { name: /saved blue points/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-best-time')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-run-count')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/settings'),
    ).toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'START A RUN' })).not.toBeInTheDocument();
    expect(screen.getByTestId('skill-map')).toHaveTextContent('NODE_09');
    expect(screen.getAllByRole('link', { name: /back to title/i }).length).toBeGreaterThan(0);
  });

  it('renders a non-interactive locked 3 by 3 map with zeroed reserved currencies', () => {
    renderSkills();

    const map = screen.getByTestId('skill-map');
    const branchHeadings = within(map).getAllByRole('heading', { level: 3 });

    expect(branchHeadings.map((heading) => heading.textContent)).toEqual([
      'BRANCH_01',
      'BRANCH_02',
      'BRANCH_03',
    ]);

    const nodes = within(map).getAllByTestId('skill-node');
    expect(nodes).toHaveLength(9);

    nodes.forEach((node) => {
      expect(node).not.toHaveAttribute('tabindex');
      expect(within(node).queryByRole('button')).not.toBeInTheDocument();
      expect(within(node).queryByRole('link')).not.toBeInTheDocument();
      expect(within(node).getByText('LOCKED')).toBeInTheDocument();
    });

    expect(within(map).queryAllByRole('button')).toHaveLength(0);
    expect(within(map).queryAllByRole('link')).toHaveLength(0);
    expect(within(map).getByText('BLUE — SURVIVAL POINTS (BANKED HERE)')).toBeInTheDocument();
    expect(within(map).getAllByTestId('reserved-currency-row')).toHaveLength(3);
    expect(within(map).getByText('PURPLE — 0 — RESERVED')).toBeInTheDocument();
    expect(within(map).getByText('GREEN — 0 — RESERVED')).toBeInTheDocument();
    expect(within(map).getByText('ORANGE — 0 — RESERVED')).toBeInTheDocument();
    expect(within(map).getAllByText('NOT YET AVAILABLE IN THIS BUILD')).toHaveLength(3);
  });
});
