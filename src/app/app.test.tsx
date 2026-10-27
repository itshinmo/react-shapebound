import { render, screen, within } from '@testing-library/react';
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

  it('renders the skills screen inside the presentation layout with the shared nav', () => {
    window.history.pushState({}, '', '/skills');

    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'SKILL TREE' })).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['01 // TITLE', '02 // PLAY', '03 // CONFIG', '04 // SKILLS']);

    const skillsLink = within(nav).getByRole('link', { name: '04 // SKILLS' });
    expect(skillsLink).toHaveAttribute('href', '/skills');
    expect(skillsLink.className).toContain('text-acid');
  });

  it('links to the skills page from the title screen', () => {
    render(<App />);

    const skillsLink = screen.getByRole('link', { name: 'SKILL TREE' });
    expect(skillsLink).toHaveAttribute('href', '/skills');
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
