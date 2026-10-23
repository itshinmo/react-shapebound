import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';

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

function setPortrait(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
    createMediaQueryList(query, query.includes('portrait')),
  );
}

describe('App routing', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('renders the title screen at the root route', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /shapebound/i })).toBeInTheDocument();
  });

  it('renders the title screen in portrait', () => {
    setPortrait();
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /shapebound/i })).toBeInTheDocument();
  });

  it('renders the not-found screen for an unknown route', () => {
    window.location.hash = '#/missing';

    render(<App />);

    expect(screen.getByText(/signal lost/i)).toBeInTheDocument();
  });
});
