import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_BLUE_POINTS, createEmptyProgression, type ProgressionData } from '@/game/progression';
import { SAVE_STORAGE_KEY, createSave, serializeSave } from '@/game/save';
import { renderWithProviders } from '@/test/render';

import { SkillsScreen } from './skills-screen';

const savedAt = '2026-10-26T12:00:00.000Z';

function seedSave(overrides: Partial<ProgressionData> = {}): void {
  const data = { ...createEmptyProgression(), ...overrides };

  window.localStorage.setItem(SAVE_STORAGE_KEY, serializeSave(createSave(data, savedAt)));
}

function readStored(): ProgressionData {
  const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);

  if (raw === null) {
    throw new Error('Expected a stored progression record.');
  }

  return (JSON.parse(raw) as { readonly data: ProgressionData }).data;
}

function renderSkills() {
  return renderWithProviders(<SkillsScreen />, { route: '/skills' });
}

function node(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name} `) });
}

describe('SkillsScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows base values, the empty callout, and the interactive tree when the save is missing', () => {
    renderSkills();

    expect(screen.getByRole('group', { name: 'Saved blue points: 0' })).toBeInTheDocument();
    expect(screen.getByTestId('skill-balance')).toHaveTextContent(/^0$/);
    expect(screen.getByTestId('skill-best-time')).toHaveTextContent(/^00:00:00$/);
    expect(screen.getByTestId('skill-run-count')).toHaveTextContent(/^0$/);
    expect(
      screen.getByRole('heading', { level: 2, name: 'NO POINTS BANKED YET' }),
    ).toBeInTheDocument();

    const tree = screen.getByTestId('skill-tree');

    expect(within(tree).getAllByRole('button')).toHaveLength(8);
    expect(within(tree).getAllByTestId('locked-node')).toHaveLength(5);
    expect(within(tree).getByRole('button', { name: /^Barrier Count / })).toBeInTheDocument();
    expect(within(tree).getByRole('button', { name: /^Reset Skills/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'START A RUN' }).length).toBeGreaterThan(0);
    expect(screen.getByText('SPENT: 0 // BANKED: 0')).toBeInTheDocument();
  });

  it('shows a valid v1 record without writing it back', () => {
    window.localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt,
        data: {
          bluePoints: 42,
          bestTimeMs: 123_000,
          runCount: 5,
          bossCurrencies: { purple: 1, green: 2, orange: 3 },
        },
      }),
    );

    renderSkills();

    expect(screen.getByTestId('skill-balance')).toHaveTextContent(/^42$/);
    expect(screen.getByTestId('skill-best-time')).toHaveTextContent(/^02:03:00$/);
    expect(screen.getByTestId('skill-run-count')).toHaveTextContent(/^5$/);
    expect(node('Barrier Count')).toHaveAttribute(
      'aria-label',
      'Barrier Count — level 0 of 3, MAX BARRIER 0 — add level, 1 blue point',
    );
    expect(window.localStorage.getItem(SAVE_STORAGE_KEY)).toContain('"schemaVersion":1');
  });

  it('shows saved balance, stats, levels, and reserved rows for a valid v2 save', () => {
    seedSave({
      bluePoints: 1_000_000_000,
      bestTimeMs: 123_456,
      runCount: 12_345,
      upgrades: {
        ...createEmptyProgression().upgrades,
        barrierCount: 2,
        movementSpeed: 5,
      },
    });

    renderSkills();

    expect(
      screen.getByRole('group', { name: 'Saved blue points: 1,000,000,000' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('skill-best-time')).toHaveTextContent(/^02:03:45$/);
    expect(screen.getByTestId('skill-run-count')).toHaveTextContent(/^12,345$/);
    expect(screen.getByRole('heading', { level: 2, name: 'SAVED LOCALLY' })).toBeInTheDocument();
    expect(screen.getByText('LOCAL ONLY')).toBeInTheDocument();
    expect(node('Barrier Count')).toHaveTextContent('2/3');
    expect(node('Movement Speed')).toHaveTextContent('MAX');
    expect(node('Movement Speed')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('SPENT: 7 // BANKED: 1,000,000,000')).toBeInTheDocument();

    const bossRows = screen.getAllByTestId('reserved-currency-row');
    expect(bossRows).toHaveLength(3);
    expect(screen.getByText('PURPLE — 0 — RESERVED')).toBeInTheDocument();
    expect(screen.getByText('GREEN — 0 — RESERVED')).toBeInTheDocument();
    expect(screen.getByText('ORANGE — 0 — RESERVED')).toBeInTheDocument();
  });

  it('adds exactly one level and one point with one write', async () => {
    const user = userEvent.setup();

    seedSave({ bluePoints: 2 });
    renderSkills();

    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const movement = node('Movement Speed');

    await user.click(movement);

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(readStored().bluePoints).toBe(1);
    expect(readStored().upgrades.movementSpeed).toBe(1);
    expect(screen.getByTestId('skill-balance')).toHaveTextContent(/^1$/);
    expect(node('Movement Speed')).toHaveTextContent('1/5');
    expect(screen.getByRole('status')).toHaveTextContent(
      'MOVEMENT SPEED RAISED TO 1/5. 1 BLUE POINTS LEFT.',
    );
    expect(node('Movement Speed')).toHaveFocus();
    expect(screen.getByText('SPENT: 1 // BANKED: 1')).toBeInTheDocument();
  });

  it('adds the last level, announces MAXED, and leaves no removal control', async () => {
    const user = userEvent.setup();

    seedSave({
      bluePoints: 1,
      upgrades: { ...createEmptyProgression().upgrades, laserPierce: 1 },
    });
    renderSkills();

    await user.click(node('Laser Pierce'));

    expect(readStored().upgrades.laserPierce).toBe(2);
    expect(readStored().bluePoints).toBe(0);
    expect(screen.getByRole('status')).toHaveTextContent(
      'LASER PIERCE MAXED AT 2/2. 0 BLUE POINTS LEFT.',
    );
    expect(node('Laser Pierce')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: /remove|minus/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /-1/ })).not.toBeInTheDocument();
  });

  it('announces max and insufficient points without writing', async () => {
    const user = userEvent.setup();

    seedSave({
      bluePoints: 0,
      upgrades: { ...createEmptyProgression().upgrades, movementSpeed: 5 },
    });
    renderSkills();

    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    await user.click(node('Movement Speed'));

    expect(screen.getByRole('status')).toHaveTextContent('MOVEMENT SPEED IS AT MAXIMUM (5/5).');

    await user.click(node('Player Size'));

    expect(screen.getByRole('status')).toHaveTextContent(
      'NOT ENOUGH BLUE POINTS. 1 REQUIRED, 0 BANKED.',
    );
    expect(setItem).not.toHaveBeenCalled();
  });

  it('disables Reset Skills at zero levels and writes nothing', async () => {
    const user = userEvent.setup();

    seedSave({ bluePoints: 0 });
    renderSkills();

    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const reset = screen.getByRole('button', { name: /^Reset Skills/ });
    const helper = screen.getByText('NO LEVELS PURCHASED // NOTHING TO REFUND');

    expect(reset).toHaveAttribute('aria-disabled', 'true');
    expect(reset).toHaveAttribute('aria-describedby', helper.id);

    await user.click(reset);

    expect(screen.getByRole('status')).toHaveTextContent('NO LEVELS TO RESET.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('opens the reset confirmation, and Cancel makes no write or state change', async () => {
    const user = userEvent.setup();

    seedSave({
      bluePoints: 0,
      bestTimeMs: 9_000,
      runCount: 2,
      upgrades: { ...createEmptyProgression().upgrades, barrierCount: 1 },
    });
    renderSkills();

    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const reset = screen.getByRole('button', { name: /^Reset Skills/ });

    await user.click(reset);

    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('heading', { level: 2, name: 'RESET ALL SKILLS?' })).toHaveFocus();
    expect(screen.getByText('LEVELS')).toBeInTheDocument();
    expect(screen.getByText('UP TO 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    expect(readStored().upgrades.barrierCount).toBe(1);
    expect(node('Barrier Count')).toHaveTextContent('1/3');

    await waitFor(() => {
      expect(reset).toHaveFocus();
    });
  });

  it('closes the confirmation on cancel without writing', async () => {
    const user = userEvent.setup();

    seedSave({
      upgrades: { ...createEmptyProgression().upgrades, barrierCount: 1 },
    });
    renderSkills();

    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    await user.click(screen.getByRole('button', { name: /^Reset Skills/ }));

    const dialog = screen.getByRole('dialog');

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('resets all levels, refunds the sum, and returns focus with one write', async () => {
    const user = userEvent.setup();

    seedSave({
      bluePoints: 0,
      bestTimeMs: 9_000,
      runCount: 2,
      bossCurrencies: { purple: 1, green: 2, orange: 3 },
      upgrades: {
        ...createEmptyProgression().upgrades,
        barrierCount: 2,
        movementSpeed: 1,
      },
    });
    renderSkills();

    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const reset = screen.getByRole('button', { name: /^Reset Skills/ });

    await user.click(reset);
    await user.click(screen.getByRole('button', { name: 'Confirm reset' }));

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(readStored().bluePoints).toBe(3);
    expect(readStored().upgrades).toEqual(createEmptyProgression().upgrades);
    expect(readStored().bestTimeMs).toBe(9_000);
    expect(readStored().runCount).toBe(2);
    expect(readStored().bossCurrencies).toEqual({ purple: 1, green: 2, orange: 3 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('SKILLS RESET. 3 BLUE POINTS AVAILABLE.');
    expect(node('Barrier Count')).toHaveTextContent('0/3');
    expect(reset).toHaveAttribute('aria-disabled', 'true');

    await waitFor(() => {
      expect(reset).toHaveFocus();
    });
  });

  it('shows the cap note when the refund would exceed the blue-point cap', async () => {
    const user = userEvent.setup();

    seedSave({
      bluePoints: MAX_BLUE_POINTS,
      upgrades: { ...createEmptyProgression().upgrades, barrierCount: 1 },
    });
    renderSkills();

    await user.click(screen.getByRole('button', { name: /^Reset Skills/ }));

    expect(
      screen.getByText(
        'BLUE POINTS ARE CAPPED. THE BALANCE WILL STOP AT THE CAP; THE EXCESS REFUND IS DISCARDED.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the old values and shows an alert when a purchase write fails', async () => {
    const user = userEvent.setup();

    seedSave({ bluePoints: 5 });
    renderSkills();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    await user.click(node('Movement Speed'));

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('SAVE FAILED — LEVEL NOT CHANGED');
    expect(alert).toHaveTextContent('The stored record is unchanged.');
    expect(node('Movement Speed')).toHaveTextContent('0/5');
    expect(screen.getByTestId('skill-balance')).toHaveTextContent(/^5$/);
    expect(readStored().upgrades.movementSpeed).toBe(0);
    expect(readStored().bluePoints).toBe(5);
  });

  it('keeps the reset dialog open with an alert when the reset write fails', async () => {
    const user = userEvent.setup();

    seedSave({
      upgrades: { ...createEmptyProgression().upgrades, barrierCount: 1 },
    });
    renderSkills();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    await user.click(screen.getByRole('button', { name: /^Reset Skills/ }));
    await user.click(screen.getByRole('button', { name: 'Confirm reset' }));

    const dialog = screen.getByRole('dialog');
    const alert = within(dialog).getByRole('alert');

    expect(alert).toHaveTextContent('SAVE FAILED — SKILLS NOT RESET');
    expect(alert).toHaveTextContent('The stored record is unchanged.');
    expect(dialog).toHaveAttribute('open');
    expect(readStored().upgrades.barrierCount).toBe(1);
    expect(node('Barrier Count')).toHaveTextContent('1/3');
    expect(screen.getByTestId('skill-balance')).toHaveTextContent(/^0$/);
    expect(screen.getByRole('button', { name: 'Confirm reset' })).toHaveFocus();
  });

  it('is keyboard operable and focuses the reset button after a keyboard cancel', async () => {
    const user = userEvent.setup();

    seedSave({
      bluePoints: 1,
      upgrades: { ...createEmptyProgression().upgrades, barrierCount: 1 },
    });
    renderSkills();

    const reset = screen.getByRole('button', { name: /^Reset Skills/ });

    reset.focus();
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('dialog');

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));

    await waitFor(() => {
      expect(reset).toHaveFocus();
    });

    node('Barrier Count').focus();
    await user.keyboard('{Enter}');

    expect(readStored().upgrades.barrierCount).toBe(2);
  });

  it('shows a static read-blocked tree with no fabricated values for an unreadable save', () => {
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{not json');

    renderSkills();

    expect(
      screen.getByRole('heading', { level: 2, name: 'SAVED PROGRESS COULD NOT BE READ' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'The local save is not readable. Nothing has been overwritten.',
    );
    expect(screen.queryByRole('group', { name: /saved blue points/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-best-time')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-run-count')).not.toBeInTheDocument();

    const tree = screen.getByTestId('skill-tree');
    const settingsLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/settings');

    expect(within(tree).queryAllByRole('button')).toHaveLength(0);
    expect(within(tree).getAllByText('READ BLOCKED')).toHaveLength(7);
    expect(within(tree).getAllByTestId('locked-node')).toHaveLength(5);
    expect(within(tree).queryByRole('button', { name: /^Reset Skills/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/^SPENT:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^RESET REFUND:/)).not.toBeInTheDocument();
    expect(settingsLinks).toHaveLength(1);
    expect(settingsLinks[0]).toHaveAccessibleName('Open Settings');
    expect(screen.queryByRole('link', { name: 'START A RUN' })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('reserved-currency-row')).toHaveLength(3);
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
      'This browser is blocking local storage. Progress cannot be read or saved, so a new run cannot start until storage is available.',
    );
    expect(screen.queryByRole('group', { name: /saved blue points/i })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/settings'),
    ).toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'START A RUN' })).not.toBeInTheDocument();

    const tree = screen.getByTestId('skill-tree');

    expect(within(tree).queryAllByRole('button')).toHaveLength(0);
    expect(within(tree).getAllByText('READ BLOCKED')).toHaveLength(7);
    expect(screen.queryByText(/^SPENT:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^RESET REFUND:/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId('reserved-currency-row')).toHaveLength(3);
  });
});
