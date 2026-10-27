import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SETTINGS_STORAGE_KEY } from '@/features/settings/settings-storage';
import { renderWithProviders } from '@/test/render';

import { PauseMenu } from './pause-menu';

import type { ComponentProps } from 'react';

type PauseMenuProps = ComponentProps<typeof PauseMenu>;

function menuElement(overrides: Partial<PauseMenuProps> = {}) {
  return (
    <PauseMenu
      frozenElapsedMs={42_170}
      onResume={() => undefined}
      onRestart={() => undefined}
      onBackToTitle={() => undefined}
      {...overrides}
    />
  );
}

function renderMenu(overrides: Partial<PauseMenuProps> = {}) {
  const props: PauseMenuProps = {
    frozenElapsedMs: 42_170,
    onResume: vi.fn(),
    onRestart: vi.fn(),
    onBackToTitle: vi.fn(),
    ...overrides,
  };

  return {
    ...renderWithProviders(<PauseMenu {...props} />, { route: '/play' }),
    onResume: props.onResume,
    onRestart: props.onRestart,
    onBackToTitle: props.onBackToTitle,
  };
}

function fireCancel(dialog: HTMLElement): Event {
  const event = new Event('cancel', { bubbles: true, cancelable: true });

  fireEvent(dialog, event);

  return event;
}

describe('PauseMenu', () => {
  it('opens a native dialog on Resume with the rail-only layout and frozen readout', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');

    renderMenu();

    const dialog = screen.getByRole('dialog');
    const title = screen.getByRole('heading', { level: 2, name: 'PAUSED' });
    const resume = screen.getByRole('button', { name: /resume/i });
    const config = screen.getByRole('button', { name: /config/i });
    const restart = screen.getByRole('button', { name: /restart/i });
    const back = screen.getByRole('button', { name: /back to title/i });
    const frozen = screen.getByRole('group', { name: 'Frozen run' });

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', title.id);
    expect(resume).toHaveFocus();
    expect(resume).not.toHaveAttribute('aria-expanded');
    expect(config).toHaveAttribute('aria-expanded', 'false');
    expect(restart).toHaveAttribute('aria-expanded', 'false');
    expect(back).toHaveAttribute('aria-expanded', 'false');
    expect(config).toHaveAttribute('aria-controls', 'pause-panel');
    expect(screen.queryByTestId('pause-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('pause-menu-frame').className).toContain('w-[min(88vw,21rem,');
    expect(screen.getByRole('navigation', { name: 'Pause menu' })).toBeInTheDocument();
    expect(within(frozen).getByRole('group', { name: 'Frozen run time' })).toHaveTextContent(
      '00:42:17',
    );
    expect(within(frozen).getByRole('group', { name: 'Frozen blue points' })).toHaveTextContent(
      '42',
    );
    expect(screen.getByText('ESC TO RESUME')).toBeInTheDocument();
    expect(screen.getByText('TAB / SHIFT+TAB TO NAVIGATE // ESC TO RESUME')).toBeInTheDocument();
    expect(screen.getByText('LOCAL // FROZEN')).toBeInTheDocument();
  });

  it('reveals the Config panel, selected marker, and neon connector', async () => {
    const user = userEvent.setup();

    renderMenu();

    const config = screen.getByRole('button', { name: /config/i });

    await user.click(config);

    const panel = screen.getByRole('region', { name: /config/i });
    const heading = screen.getByRole('heading', { level: 3, name: 'CONFIG' });
    const frame = screen.getByTestId('pause-menu-frame');
    const connector = screen.getByTestId('pause-connector');

    expect(config).toHaveAttribute('aria-expanded', 'true');
    expect(config).toHaveAttribute('aria-current', 'true');
    expect(config).toHaveAttribute('aria-controls', 'pause-panel');
    expect(panel).toHaveAttribute('id', 'pause-panel');
    expect(panel).toHaveAttribute('aria-labelledby', config.id);
    expect(heading).toHaveFocus();
    expect(screen.getByText('/// PAUSE // PREFERENCES')).toBeInTheDocument();
    expect(screen.getByText(/changes apply immediately/i)).toBeInTheDocument();
    expect(screen.getByTestId('pause-selected-bar').className).toContain('bg-cyan');
    expect(connector.className).toContain('bg-cyan');
    expect(connector.className).toContain('glow-hud');
    expect(frame).toHaveAttribute('data-expanded', 'true');
    expect(frame.className).toContain('w-[min(94vw,56rem,');
    expect(screen.getByTestId('pause-menu-body').className).toContain(
      'grid-cols-[10rem_minmax(0,1fr)]',
    );
    expect(screen.getByRole('checkbox', { name: /reduce motion/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /glow intensity/i })).toBeInTheDocument();
    expect(screen.getByText(/presentation pages keep fixed glows/i)).toBeInTheDocument();
    expect(
      screen.getByText('IN-RUN GLOW ONLY. PRESENTATION PAGES STAY FIXED.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('glow-preview')).toBeInTheDocument();
    expect(screen.getByText('STATIC PREVIEW')).toBeInTheDocument();
  });

  it('shows the static preview miniatures with the in-run glow utilities', async () => {
    const user = userEvent.setup();

    renderMenu();

    await user.click(screen.getByRole('button', { name: /config/i }));

    const preview = screen.getByTestId('glow-preview');

    expect(preview.className).toContain('[--glow-scale:0.5]');
    expect(screen.getByTestId('glow-preview-enemy').className).toContain('glow-enemy');
    expect(screen.getByTestId('glow-preview-warning').className).toContain('glow-warning');
    expect(screen.getByTestId('glow-preview-track').className).toContain('glow-track');
    expect(screen.getByTestId('glow-preview-boss').className).toContain('glow-hud');
  });

  it('persists settings immediately while the menu and run stay paused', async () => {
    const user = userEvent.setup();
    const { onResume } = renderMenu();

    await user.click(screen.getByRole('button', { name: /config/i }));

    const slider = screen.getByRole('slider', { name: /glow intensity/i });
    const motion = screen.getByRole('checkbox', { name: /reduce motion/i });

    expect(slider).toHaveValue('100');
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '40' } });

    expect(slider).toHaveValue('40');
    expect(screen.getByText('40%')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"glowIntensity":40');
    });
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--glow-intensity')).toBe('40');
    });

    await user.click(motion);

    expect(motion).toBeChecked();
    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"reducedMotion":true');
    });

    expect(onResume).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
  });

  it('confirms Restart with Cancel first, then calls the restart callback', async () => {
    const user = userEvent.setup();
    const { onRestart } = renderMenu();

    const restart = screen.getByRole('button', { name: /restart/i });

    await user.click(restart);

    const panel = screen.getByTestId('pause-panel');
    const heading = screen.getByRole('heading', { level: 3, name: 'RESTART RUN' });
    const actions = within(panel).getAllByRole('button');

    expect(heading).toHaveFocus();
    expect(screen.getByText('/// CONFIRM // DESTRUCTIVE')).toBeInTheDocument();
    expect(screen.getByText(/saved progression is not changed/i)).toBeInTheDocument();
    expect(actions.map((button) => button.textContent.trim())).toEqual([
      'Cancel',
      'Confirm restart',
    ]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByTestId('pause-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('pause-menu-frame').className).toContain('w-[min(88vw,21rem,');
    expect(onRestart).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(restart).toHaveFocus();
    });

    await user.click(restart);
    await user.click(screen.getByRole('button', { name: 'Confirm restart' }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('confirms Back to title with Cancel first, then calls the navigation callback', async () => {
    const user = userEvent.setup();
    const { onBackToTitle } = renderMenu();

    const back = screen.getByRole('button', { name: /back to title/i });

    await user.click(back);

    const panel = screen.getByTestId('pause-panel');
    const heading = screen.getByRole('heading', { level: 3, name: 'BACK TO TITLE' });
    const actions = within(panel).getAllByRole('button');

    expect(heading).toHaveFocus();
    expect(screen.getByText('/// CONFIRM // LEAVE RUN')).toBeInTheDocument();
    expect(actions.map((button) => button.textContent.trim())).toEqual([
      'Cancel',
      'Confirm back to title',
    ]);

    await user.click(screen.getByRole('button', { name: 'Confirm back to title' }));

    expect(onBackToTitle).toHaveBeenCalledTimes(1);
  });

  it('resumes on Escape when no panel is open', () => {
    const { onResume } = renderMenu();
    const dialog = screen.getByRole('dialog');
    const event = fireCancel(dialog);

    expect(event.defaultPrevented).toBe(true);
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
  });

  it('resumes on Escape from Config', async () => {
    const user = userEvent.setup();
    const { onResume } = renderMenu();

    await user.click(screen.getByRole('button', { name: /config/i }));
    fireCancel(screen.getByRole('dialog'));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('cancels a Restart confirmation on Escape, collapses, and focuses the rail item', async () => {
    const user = userEvent.setup();
    const { onResume } = renderMenu();

    const restart = screen.getByRole('button', { name: /restart/i });

    await user.click(restart);

    const dialog = screen.getByRole('dialog');
    const event = fireCancel(dialog);

    expect(event.defaultPrevented).toBe(true);
    expect(onResume).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute('open');
    expect(screen.queryByTestId('pause-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('pause-menu-frame').className).toContain('w-[min(88vw,21rem,');

    await waitFor(() => {
      expect(restart).toHaveFocus();
    });
  });

  it('does nothing on an outside click', () => {
    const { onResume } = renderMenu();
    const dialog = screen.getByRole('dialog');
    const backdrop = screen.getByTestId('pause-backdrop');

    fireEvent.click(backdrop);
    fireEvent.click(dialog);

    expect(onResume).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute('open');
  });

  it('keeps the Skill Tree focusable, locked, and non-navigating', async () => {
    const user = userEvent.setup();
    const { onResume } = renderMenu();

    const skillTree = screen.getByRole('button', { name: /skill tree/i });

    expect(skillTree).toHaveAttribute('aria-disabled', 'true');
    expect(skillTree).toHaveTextContent('AVAILABLE AFTER THE RUN');
    expect(screen.queryByRole('link', { name: /skill tree/i })).not.toBeInTheDocument();

    skillTree.focus();

    expect(skillTree).toHaveFocus();

    await user.click(skillTree);

    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(onResume).not.toHaveBeenCalled();
  });

  it('closes while suspended and restores the open panel and focus on return', async () => {
    const user = userEvent.setup();

    const view = renderWithProviders(menuElement(), { route: '/play' });

    await user.click(screen.getByRole('button', { name: /config/i }));

    const dialog = screen.getByRole('dialog');
    const config = screen.getByRole('button', { name: /config/i });
    const heading = screen.getByRole('heading', { level: 3, name: 'CONFIG' });

    expect(dialog).toHaveAttribute('open');
    expect(heading).toHaveFocus();

    view.rerender(menuElement({ suspended: true }));

    expect(dialog).not.toHaveAttribute('open');
    expect(heading).toBeInTheDocument();
    expect(config).toHaveAttribute('aria-expanded', 'true');

    view.rerender(menuElement({ suspended: false }));

    expect(dialog).toHaveAttribute('open');

    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(config).toHaveAttribute('aria-current', 'true');
  });

  it('renders instantly under the in-app reduced-motion setting', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, reducedMotion: true, glowIntensity: 100 }),
    );

    renderMenu();

    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('data-reduced-motion', 'true');

    await user.click(screen.getByRole('button', { name: /config/i }));

    expect(screen.getByTestId('pause-panel-content').className).toContain('opacity-100');
    expect(screen.getByTestId('pause-connector').className).toContain('scale-x-100');
    expect(screen.getByText('SYSTEM DEFAULT: FULL')).toBeInTheDocument();
    expect(screen.getByTestId('pause-motion-switch')).toHaveClass('motion-switch');
  });
});
