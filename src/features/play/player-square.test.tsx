import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { PlayerSquare } from './player-square';

function renderSquare(overrides: Partial<Parameters<typeof PlayerSquare>[0]> = {}) {
  const playerRef = createRef<HTMLDivElement>();
  const ringProgressRef = createRef<SVGCircleElement>();

  render(
    <PlayerSquare
      playerRef={playerRef}
      size={64}
      maxReflectCharges={2}
      charges={2}
      maxBarrier={3}
      barrier={3}
      ringProgressRef={ringProgressRef}
      barrierHit={false}
      {...overrides}
    />,
  );

  return { playerRef, ringProgressRef };
}

describe('PlayerSquare', () => {
  it('renders no charge ring at reflect level 0', () => {
    renderSquare({ maxReflectCharges: 0, charges: 0 });

    expect(screen.queryByTestId('charge-ring')).not.toBeInTheDocument();
    expect(screen.queryByTestId('charge-count')).not.toBeInTheDocument();
  });

  it('renders the ring and centered charge digit at level 1 or higher', () => {
    renderSquare({ maxReflectCharges: 1, charges: 1, size: 24 });

    const ring = screen.getByTestId('charge-ring');
    const progress = screen.getByTestId('charge-ring-progress');

    expect(screen.getByTestId('charge-count')).toHaveTextContent('1');
    expect(screen.getByTestId('charge-ring-track')).toHaveAttribute('stroke-width', '2');
    expect(ring).toContainElement(progress);
    expect(progress).toHaveAttribute('stroke-width', '2');
    expect(progress).toHaveAttribute('r', '7');
    expect(progress).toHaveAttribute('stroke-dashoffset', '0');
  });

  it('renders exactly maxBarrier notches and fills the current count', () => {
    renderSquare({ maxBarrier: 3, barrier: 2 });

    const notches = screen.getAllByTestId('barrier-notch');

    expect(notches).toHaveLength(3);
    expect(notches[0]).toHaveAttribute('data-filled', 'true');
    expect(notches[1]).toHaveAttribute('data-filled', 'true');
    expect(notches[2]).toHaveAttribute('data-filled', 'false');
  });

  it('renders no notch row at max barrier 0', () => {
    renderSquare({ maxBarrier: 0, barrier: 0 });

    expect(screen.queryByTestId('barrier-notches')).not.toBeInTheDocument();
  });

  it('adds the 2 px outline only while the barrier hit cue is active', () => {
    const { rerender } = render(
      <PlayerSquare
        playerRef={createRef<HTMLDivElement>()}
        size={64}
        maxReflectCharges={0}
        charges={0}
        maxBarrier={1}
        barrier={1}
        ringProgressRef={createRef<SVGCircleElement>()}
        barrierHit={true}
      />,
    );

    expect(screen.getByTestId('player-square')).toHaveClass('outline-2', 'outline-ink');
    expect(screen.getByTestId('player-square')).toHaveAttribute('data-barrier-hit', 'true');

    rerender(
      <PlayerSquare
        playerRef={createRef<HTMLDivElement>()}
        size={64}
        maxReflectCharges={0}
        charges={0}
        maxBarrier={1}
        barrier={1}
        ringProgressRef={createRef<SVGCircleElement>()}
        barrierHit={false}
      />,
    );

    expect(screen.getByTestId('player-square')).not.toHaveClass('outline-2');
    expect(screen.getByTestId('player-square')).not.toHaveAttribute('data-barrier-hit');
  });
});
