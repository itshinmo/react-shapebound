import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';

describe('App routing', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('renders the title screen at the root route', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /shapebound/i })).toBeInTheDocument();
  });

  it('renders the not-found screen for an unknown route', () => {
    window.location.hash = '#/missing';

    render(<App />);

    expect(screen.getByText(/signal lost/i)).toBeInTheDocument();
  });
});
