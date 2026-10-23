import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LandscapeGate } from './landscape-gate';

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

function setPortrait(portrait: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
    createMediaQueryList(query, portrait && query.includes('portrait')),
  );
}

describe('LandscapeGate', () => {
  it('blocks the app in portrait', () => {
    setPortrait(true);

    render(
      <LandscapeGate>
        <p>playfield</p>
      </LandscapeGate>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /rotate to landscape/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('playfield')).not.toBeInTheDocument();
  });

  it('renders the app in landscape', () => {
    setPortrait(false);

    render(
      <LandscapeGate>
        <p>playfield</p>
      </LandscapeGate>,
    );

    expect(screen.getByText('playfield')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /rotate to landscape/i })).not.toBeInTheDocument();
  });
});
