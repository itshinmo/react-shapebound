import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SAVE_STORAGE_KEY } from '@/game/save';
import { renderWithProviders } from '@/test/render';

import { SettingsScreen } from './settings-screen';
import { SETTINGS_STORAGE_KEY } from './settings-storage';

describe('SettingsScreen', () => {
  it('persists the reduced-motion preference', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    const toggle = screen.getByRole('checkbox', { name: /reduce motion/i });
    expect(toggle).not.toBeChecked();

    await user.click(toggle);
    expect(toggle).toBeChecked();

    await waitFor(() => {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(raw).toContain('"reducedMotion":true');
    });
  });

  it('asks for confirmation before clearing local data', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, reducedMotion: true }),
    );
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{"schemaVersion":1}');

    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    await user.click(screen.getByRole('button', { name: /clear local data/i }));
    expect(screen.getByRole('button', { name: /confirm reset/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm reset/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/local data cleared/i);
    expect(window.localStorage.getItem(SAVE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"reducedMotion":false');
  });
});
