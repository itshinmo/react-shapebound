import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SAVE_STORAGE_KEY } from '@/game/save';

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

  it('does not treat an unknown path as a hash route', () => {
    window.history.replaceState({}, '', '/ax#/skills');

    render(<App />);

    expect(screen.getByText(/signal lost/i)).toBeInTheDocument();
  });

  it('keeps the skip link out of the route path', () => {
    window.history.replaceState({}, '', '/missing');

    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: /skip to content/i }));

    expect(window.location.pathname).toBe('/missing');
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('main')).toHaveFocus();
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

  it('shows the completed module history on the title screen', () => {
    render(<App />);

    expect(screen.getByText('SYSTEM_MODULES // DEVELOPMENT_HISTORY')).toBeInTheDocument();

    for (const name of [
      'DOM + CSS',
      'FIRST PLAYABLE',
      'SURVIVAL LOOP',
      'THREAT SYSTEM',
      'PAUSE + RUN-OVER',
      'LOCAL PROGRESSION',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('renders the play screen outside the presentation layout', () => {
    window.history.pushState({}, '', '/play');

    render(<App />);

    expect(screen.getByRole('region', { name: 'Play field' })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('keeps the save gate focused when navigating to a blocked play route', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(SAVE_STORAGE_KEY, '{not json');

    render(<App />);

    const initialize = within(screen.getByRole('main'))
      .getAllByRole('link', { name: /initialize/i })
      .at(0);

    if (initialize === undefined) {
      throw new Error('Expected an INITIALIZE link.');
    }

    await user.click(initialize);

    const gate = await screen.findByRole('alert');

    expect(gate).toHaveTextContent('SAVED PROGRESS COULD NOT BE READ');
    expect(gate).toHaveFocus();
    expect(screen.queryByRole('region', { name: 'Play field' })).not.toBeInTheDocument();
  });

  it('renders the not-found screen with a glitched, briefly flipping 404', () => {
    window.history.pushState({}, '', '/missing');

    render(<App />);

    expect(screen.getByText(/signal lost/i)).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 1, name: '404' });
    expect(heading).toHaveClass('animate-glitch-flip');
    expect(within(heading).getByText('404')).toHaveClass('animate-glitch');
  });
});
