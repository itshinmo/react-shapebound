import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { PlayScreen } from './play-screen';

function createMediaQueryList(query: string, matches: boolean): MediaQueryList {
  return {
    matches,
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

function setPortrait(portrait: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
    createMediaQueryList(query, portrait && query.includes('portrait')),
  );
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
}

describe('PlayScreen', () => {
  beforeEach(() => {
    setTouchDevice(false);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the play field, enemy layer, and HUD on desktop without a header or pause control', () => {
    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(screen.getByRole('region', { name: 'Play field' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /play field/i })).toBeInTheDocument();
    expect(screen.getByText(/move with w a s d/i)).toBeInTheDocument();
    expectEnemyLayer();
    expectRunHud();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('boss-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
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

    await user.click(start);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

    expectRunHud();
    expectEnemyLayer();
  });

  it('blocks only the play surface in portrait', () => {
    setPortrait(true);

    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(
      screen.getByRole('heading', { level: 1, name: /rotate to landscape/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Play field' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('enemy-layer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('run-hud')).not.toBeInTheDocument();
  });
});
