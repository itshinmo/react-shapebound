import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { PlayerContainer } from './player-container';

describe('PlayerContainer', () => {
  it('keeps the arena square when the viewport is shorter than its configured size', () => {
    render(
      <PlayerContainer arenaRef={createRef<HTMLDivElement>()} size={420}>
        <span />
      </PlayerContainer>,
    );

    const arena = screen.getByTestId('player-container');

    expect(arena.style.width).toContain('420px');
    expect(arena.style.width).toContain('100cqw');
    expect(arena.style.width).toContain('100cqh');
    expect(arena.style.height).toBe(arena.style.width);
  });
});
