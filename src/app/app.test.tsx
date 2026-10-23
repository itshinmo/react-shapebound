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
    window.history.replaceState({}, '', '/');
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

  it('renders the shared header on settings', () => {
    window.history.pushState({}, '', '/settings');

    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /03 \/\/ config/i })).toBeInTheDocument();
  });

  it('renders the play screen outside the presentation layout', () => {
    window.history.pushState({}, '', '/play');

    render(<App />);

    expect(screen.getByRole('region', { name: 'Play field' })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('renders the not-found screen for an unknown route', () => {
    window.history.pushState({}, '', '/missing');

    render(<App />);

    expect(screen.getByText(/signal lost/i)).toBeInTheDocument();
  });
});
