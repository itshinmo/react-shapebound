import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stepEnemies } from '@/game/enemy-world';
import type * as EnemyWorldModule from '@/game/enemy-world';
import { renderWithProviders } from '@/test/render';

import { PlayScreen } from './play-screen';

vi.mock('@/game/enemy-world', async (importOriginal) => {
  const actual = await importOriginal<typeof EnemyWorldModule>();

  return {
    ...actual,
    stepEnemies: vi.fn(actual.stepEnemies),
  };
});

const actualStepEnemies = vi.mocked(stepEnemies).getMockImplementation();

let portraitState = false;

function createMediaQueryList(query: string, matches: () => boolean): MediaQueryList {
  return {
    get matches() {
      return matches();
    },
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  } as unknown as MediaQueryList;
}

function setTouchDevice(touch: boolean): void {
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: touch ? 1 : 0,
  });
}

function stubPortrait(initial: boolean): void {
  portraitState = initial;
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
    createMediaQueryList(query, () => portraitState && query.includes('portrait')),
  );
}

function changePortrait(portrait: boolean): void {
  portraitState = portrait;
  fireEvent(window, new Event('resize'));
}

function expectEnemyLayer(): void {
  const layer = screen.getByTestId('enemy-layer');

  expect(layer).toHaveAttribute('aria-hidden', 'true');
  expect(layer.className).toContain('pointer-events-none');
  expect(layer.className).toContain('z-20');
  expect(screen.getAllByTestId('enemy-body')).toHaveLength(24);
  expect(screen.getAllByTestId('enemy-warning')).toHaveLength(2);
  expect(screen.getAllByTestId('enemy-beam')).toHaveLength(2);
}

function expectRunHud(): void {
  const hud = screen.getByTestId('run-hud');

  expect(hud).toHaveAttribute('data-run-hud');
  expect(hud.className).toContain('pointer-events-none');
  expect(hud.className).toContain('z-30');
  expect(screen.getByRole('timer')).toHaveTextContent('00:00:00');
  expect(screen.getByText('RUN TIME')).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Blue points: 0' })).toBeInTheDocument();
  expect(screen.getByText('BOSS CYCLE:')).toBeInTheDocument();
  expect(screen.getByTestId('run-timeline')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pause menu' })).toBeInTheDocument();
}

function stubAnimationFrames() {
  const frames: FrameRequestCallback[] = [];

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  return frames;
}

describe('PlayScreen', () => {
  beforeEach(() => {
    portraitState = false;
    setTouchDevice(false);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    if (actualStepEnemies !== undefined) {
      vi.mocked(stepEnemies).mockImplementation(actualStepEnemies);
    }

    vi.unstubAllGlobals();
  });

  it('renders the play field, enemy layer, HUD, and the pause control on desktop', () => {
    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    expect(playField).toBeInTheDocument();
    expect(playField).toHaveAttribute('tabindex', '-1');
    expect(playField).not.toHaveAttribute('inert');
    expect(screen.getByRole('heading', { level: 1, name: /play field/i })).toBeInTheDocument();
    expect(screen.getByText(/move with w a s d/i)).toBeInTheDocument();
    expectEnemyLayer();
    expectRunHud();
    expect(screen.getByRole('button', { name: 'Pause menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('boss-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portrait-gate')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/shield/i)).not.toBeInTheDocument();
  });

  it('hides the HUD behind the START gate on touch and shows it after the tap', async () => {
    setTouchDevice(true);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const start = screen.getByRole('button', { name: /start/i });

    expect(start).toBeInTheDocument();
    expect(screen.queryByTestId('run-hud')).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expectEnemyLayer();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(start);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

    expectRunHud();
    expectEnemyLayer();
  });

  it('keeps the run mounted and inert behind the portrait overlay', async () => {
    stubPortrait(true);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    expect(
      screen.getByRole('heading', { level: 1, name: /rotate to landscape/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('portrait-gate')).toBeInTheDocument();
    expect(playField).toBeInTheDocument();
    expect(playField).toHaveAttribute('inert');
    expectEnemyLayer();
    expect(screen.getByTestId('run-hud')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the pause menu from the pause button and resumes with focus return', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const pauseButton = screen.getByRole('button', { name: 'Pause menu' });

    await user.click(pauseButton);

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('id', 'pause-menu');
    expect(screen.getByRole('heading', { level: 2, name: 'PAUSED' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();
    expect(pauseButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: /resume/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(pauseButton).toHaveFocus();
    });
    expect(pauseButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the pause menu on Escape and resumes through the dialog cancel', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const pauseButton = screen.getByRole('button', { name: 'Pause menu' });

    await user.keyboard('{Escape}');

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('id', 'pause-menu');
    expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(pauseButton).toHaveFocus();
    });
  });

  it('restarts from the pause confirmation and focuses the play field root', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));
    await user.click(await screen.findByRole('button', { name: /restart/i }));
    await user.click(screen.getByRole('button', { name: 'Confirm restart' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(playField).toHaveFocus();
    });
    expect(screen.getByRole('timer')).toHaveTextContent('00:00:00');
    expect(screen.getByRole('button', { name: 'Pause menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens the pause menu once when portrait returns and stays paused', async () => {
    stubPortrait(true);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    expect(playField).toHaveAttribute('inert');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    changePortrait(false);

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('id', 'pause-menu');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();
    expect(playField).not.toHaveAttribute('inert');

    changePortrait(false);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAttribute('open');

    await user.click(screen.getByRole('button', { name: /resume/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('suspends the open pause menu while portrait and restores it once', async () => {
    stubPortrait(false);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));

    const dialog = await screen.findByRole('dialog');
    const pausedHeading = screen.getByRole('heading', { level: 2, name: 'PAUSED' });

    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();

    changePortrait(true);

    expect(dialog).not.toHaveAttribute('open');
    expect(screen.getByTestId('portrait-gate')).toBeInTheDocument();
    expect(playField).toHaveAttribute('inert');
    expect(pausedHeading).toBeInTheDocument();

    changePortrait(false);

    expect(dialog).toHaveAttribute('open');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();
    });
    expect(playField).not.toHaveAttribute('inert');
  });

  it('locks the pause Skill Tree item without navigating', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));

    const skillTree = await screen.findByRole('button', { name: /skill tree/i });

    expect(skillTree).toHaveAttribute('aria-disabled', 'true');

    await user.click(skillTree);

    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(screen.queryByRole('heading', { level: 1, name: /skill/i })).not.toBeInTheDocument();
  });

  it('freezes on window blur without opening a pause menu', () => {
    renderWithProviders(<PlayScreen />, { route: '/play' });

    fireEvent.blur(window);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    fireEvent.focus(window);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mounts the run-over on death, suspends it in portrait, and restores it on landscape', async () => {
    stubPortrait(false);
    const user = userEvent.setup();
    const frames = stubAnimationFrames();

    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: { slotId: 0, kind: 'red-square', atMs: 20 },
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });
    const frame = frames[0];

    expect(playField).not.toHaveAttribute('inert');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(frame).toBeDefined();

    if (frame === undefined) {
      return;
    }

    act(() => {
      frame(performance.now() + 100);
    });

    const dialog = await screen.findByRole('dialog');
    const heading = screen.getByRole('heading', { level: 2, name: 'SIGNAL LOST' });

    expect(playField).toHaveAttribute('inert');
    expect(heading).toHaveFocus();
    expect(screen.getByRole('timer')).toHaveTextContent('00:00:02');
    expect(screen.getByTestId('run-hud').className).toContain('z-30');
    expect(screen.queryByRole('button', { name: 'Pause menu' })).not.toBeInTheDocument();

    changePortrait(true);

    expect(dialog).not.toHaveAttribute('open');
    expect(screen.getByTestId('portrait-gate')).toBeInTheDocument();
    expect(playField).toHaveAttribute('inert');
    expect(screen.queryByRole('heading', { level: 2, name: 'PAUSED' })).not.toBeInTheDocument();

    changePortrait(false);

    expect(dialog).toHaveAttribute('open');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(screen.queryByRole('heading', { level: 2, name: 'PAUSED' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(playField).not.toHaveAttribute('inert');

    await waitFor(() => {
      expect(playField).toHaveFocus();
    });

    expect(screen.getByRole('timer')).toHaveTextContent('00:00:00');
    expect(screen.getByRole('button', { name: 'Pause menu' })).toBeInTheDocument();
  });
});
