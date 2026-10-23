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

describe('PlayScreen', () => {
  beforeEach(() => {
    setTouchDevice(false);
  });

  it('renders the play field without a header or HUD on desktop', () => {
    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(screen.getByRole('region', { name: 'Play field' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /play field/i })).toBeInTheDocument();
    expect(screen.getByText(/move with w a s d/i)).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/shield/i)).not.toBeInTheDocument();
  });

  it('shows the start overlay on touch and starts after the tap', async () => {
    setTouchDevice(true);
    const user = userEvent.setup();
    renderWithProviders(<PlayScreen />, { route: '/play' });

    const start = screen.getByRole('button', { name: /start/i });
    expect(start).toBeInTheDocument();

    await user.click(start);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });
  });

  it('blocks only the play surface in portrait', () => {
    setPortrait(true);
    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(
      screen.getByRole('heading', { level: 1, name: /rotate to landscape/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Play field' })).not.toBeInTheDocument();
  });
});
