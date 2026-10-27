import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LandscapeGate } from './landscape-gate';

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

function stubPortrait(initial: boolean) {
  let portrait = initial;

  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
    createMediaQueryList(query, () => portrait && query.includes('portrait')),
  );

  return {
    set(next: boolean) {
      portrait = next;
      fireEvent(window, new Event('resize'));
    },
  };
}

describe('LandscapeGate', () => {
  it('keeps the play surface mounted behind a blocking portrait overlay', () => {
    stubPortrait(true);

    render(
      <LandscapeGate>
        <p>playfield</p>
      </LandscapeGate>,
    );

    const overlay = screen.getByTestId('portrait-gate');

    expect(
      screen.getByRole('heading', { level: 1, name: /rotate to landscape/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('playfield')).toBeInTheDocument();
    expect(overlay).toHaveAttribute('data-orientation', 'portrait');
    expect(overlay.className).toContain('z-[200]');
    expect(overlay.className).toContain('bg-void');
  });

  it('renders the app in landscape without the overlay', () => {
    stubPortrait(false);

    render(
      <LandscapeGate>
        <p>playfield</p>
      </LandscapeGate>,
    );

    expect(screen.getByText('playfield')).toBeInTheDocument();
    expect(screen.queryByTestId('portrait-gate')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /rotate to landscape/i })).not.toBeInTheDocument();
  });

  it('passes the single orientation state to a render-prop child', () => {
    const orientation = stubPortrait(false);

    render(
      <LandscapeGate>{(portrait) => <p>{portrait ? 'portrait' : 'landscape'}</p>}</LandscapeGate>,
    );

    expect(screen.getByText('landscape')).toBeInTheDocument();

    orientation.set(true);

    expect(screen.getByText('portrait')).toBeInTheDocument();
    expect(screen.getByTestId('portrait-gate')).toBeInTheDocument();
  });
});
