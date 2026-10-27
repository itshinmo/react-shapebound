import { fireEvent, screen, waitFor } from '@testing-library/react';
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

  it('persists glow intensity and updates the static preview', async () => {
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    const slider = screen.getByRole('slider', { name: /glow intensity/i });
    expect(slider).toHaveValue('100');
    expect(screen.getByText(/static preview/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Adjust the glow on every in-run surface: the play field, enemies, warnings, timeline, boss banner, pause menu, and run-over. Presentation pages keep fixed glows.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('IN-RUN GLOW ONLY. PRESENTATION PAGES STAY FIXED.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('glow-preview')).toBeInTheDocument();
    expect(screen.getByTestId('glow-preview-enemy')).toBeInTheDocument();
    expect(screen.getByTestId('glow-preview-warning')).toBeInTheDocument();
    expect(screen.getByTestId('glow-preview-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('glow-preview-boss')).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '40' } });

    expect(slider).toHaveValue('40');
    expect(screen.getByText('40%')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"glowIntensity":40');
    });
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--glow-intensity')).toBe('40');
    });
  });

  it('preserves glow intensity when reduced motion changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    fireEvent.change(screen.getByRole('slider', { name: /glow intensity/i }), {
      target: { value: '40' },
    });
    await user.click(screen.getByRole('checkbox', { name: /reduce motion/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"reducedMotion":true');
    });
    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"glowIntensity":40');
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
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"glowIntensity":100');
  });
});
