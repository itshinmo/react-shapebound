import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('PlayScreen', () => {
  beforeEach(() => {
    setTouchDevice(false);
  });

  it('renders the play field and enemy layer without a header or HUD on desktop', () => {
    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(screen.getByRole('region', { name: 'Play field' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /play field/i })).toBeInTheDocument();
    expect(screen.getByText(/move with w a s d/i)).toBeInTheDocument();
    expectEnemyLayer();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText(/run time/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/boss marker/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/shield/i)).not.toBeInTheDocument();
  });

  it('shows the start overlay on touch and starts after the tap', async () => {
    setTouchDevice(true);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const start = screen.getByRole('button', { name: /start/i });
    expect(start).toBeInTheDocument();
    expectEnemyLayer();

    await user.click(start);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

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
  });
});
