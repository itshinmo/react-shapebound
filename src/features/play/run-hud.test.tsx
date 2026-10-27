import { act, fireEvent, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SETTINGS_STORAGE_KEY } from '@/features/settings/settings-storage';
import { advanceRun, createRun } from '@/game/run';
import type { RunState } from '@/game/run';
import { renderWithProviders } from '@/test/render';

import { RunHud } from './run-hud';

import type { RunHudHandle } from './run-hud';
import type { RunBannerSnapshot } from './use-run-loop';

function runAt(ms: number): RunState {
  return advanceRun(createRun(7), ms);
}

interface RenderHudOptions {
  readonly banner?: RunBannerSnapshot | null;
  readonly isPaused?: boolean;
  readonly showPause?: boolean;
  readonly onPause?: () => void;
}

function renderHud(options: RenderHudOptions = {}) {
  const handleRef = createRef<RunHudHandle>();
  const onPause = options.onPause ?? (() => undefined);

  const view = renderWithProviders(
    <RunHud
      ref={handleRef}
      banner={options.banner ?? null}
      isPaused={options.isPaused ?? false}
      showPause={options.showPause ?? true}
      onPause={onPause}
    />,
    {
      route: '/play',
    },
  );

  return { ...view, handleRef, onPause };
}

function write(handleRef: { current: RunHudHandle | null }, ms: number): void {
  act(() => {
    handleRef.current?.write(runAt(ms));
  });
}

function timelineTrack(): HTMLElement {
  return screen.getByTestId('timeline-track');
}

function timelineNodes(): HTMLElement[] {
  return screen.getAllByTestId(/^timeline-node-/);
}

function timelineNode(id: string): HTMLElement {
  return screen.getByTestId(`timeline-node-${id}`);
}

function hiddenItems(): string[] {
  return screen.getAllByRole('listitem').map((item) => item.textContent.trim());
}

function enableReducedMotion(): void {
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({ version: 2, reducedMotion: true, glowIntensity: 100 }),
  );
}

describe('RunHud timer and points', () => {
  it('renders a labelled timer that is not a live region, with a reserved zero-points row', () => {
    renderHud();

    const timer = screen.getByRole('timer');

    expect(timer).toHaveTextContent('00:00:00');
    expect(timer).toHaveAttribute('aria-live', 'off');
    expect(timer).not.toHaveAttribute('aria-label');
    expect(screen.getByText('RUN TIME')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Blue points: 0' })).toBeInTheDocument();
    expect(screen.getByTestId('run-points-row')).toHaveClass('invisible');
    expect(screen.getByTestId('run-points-row')).toHaveClass('min-h-[0.8rem]');
  });

  it('writes elapsed time imperatively and shows the first point at exactly 1000 ms', () => {
    const { handleRef } = renderHud();
    const timer = screen.getByRole('timer');

    write(handleRef, 999);

    expect(timer).toHaveTextContent('00:00:99');
    expect(screen.getByRole('group', { name: 'Blue points: 0' })).toBeInTheDocument();
    expect(screen.getByTestId('run-points-row')).toHaveClass('invisible');

    write(handleRef, 1_000);

    expect(timer).toHaveTextContent('00:01:00');
    expect(screen.getByRole('group', { name: 'Blue points: 1' })).toBeInTheDocument();
    expect(screen.getByTestId('run-points-row')).not.toHaveClass('invisible');
    expect(screen.getByTestId('run-points')).toHaveTextContent('1');
  });

  it('formats 59 999, 60 000, and 6 000 000 ms without rounding', () => {
    const { handleRef } = renderHud();
    const timer = screen.getByRole('timer');

    write(handleRef, 59_999);
    expect(timer).toHaveTextContent('00:59:99');

    write(handleRef, 60_000);
    expect(timer).toHaveTextContent('01:00:00');

    write(handleRef, 6_000_000);
    expect(timer).toHaveTextContent('100:00:00');
    expect(screen.getByRole('group', { name: 'Blue points: 6000' })).toBeInTheDocument();
  });

  it('updates the timer DOM in place without remounting the timer node', () => {
    const { handleRef } = renderHud();
    const timer = screen.getByRole('timer');

    write(handleRef, 120);
    write(handleRef, 2_340);

    expect(screen.getByRole('timer')).toBe(timer);
    expect(timer).toHaveTextContent('00:02:34');
  });

  it('sets the arena-top CSS variable imperatively', () => {
    const { handleRef } = renderHud();
    const root = screen.getByTestId('run-hud');

    act(() => {
      handleRef.current?.setArenaTop(84);
    });

    expect(root.style.getPropertyValue('--arena-top')).toBe('84px');

    act(() => {
      handleRef.current?.setArenaTop(-4);
    });

    expect(root.style.getPropertyValue('--arena-top')).toBe('0px');
  });

  it('blocks pointer gestures in the no-joystick strip without becoming focusable', () => {
    const handler = vi.fn();
    renderHud();
    const strip = screen.getByTestId('hud-no-joystick');

    expect(strip).toHaveAttribute('aria-hidden', 'true');
    expect(strip).not.toHaveAttribute('tabindex');
    expect(strip.className).toContain('pointer-events-auto');

    document.addEventListener('pointerdown', handler);
    fireEvent.pointerDown(strip);
    document.removeEventListener('pointerdown', handler);

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('RunHud timeline', () => {
  it('renders the t=0 window with a current start node, a future boss, and hidden labels', () => {
    renderHud();

    expect(timelineTrack().style.transform).toBe('translate3d(160px, 0, 0)');

    const nodes = timelineNodes();

    expect(nodes.map((node) => node.dataset['timelineNode'])).toEqual(['start', 'boss-1']);
    expect(timelineNode('start')).toHaveAttribute('data-state', 'current');
    expect(timelineNode('start').style.left).toBe('0px');
    expect(screen.getByTestId('timeline-ring-start')).toBeInTheDocument();
    expect(timelineNode('boss-1')).toHaveAttribute('data-state', 'future');
    expect(timelineNode('boss-1').style.left).toBe('160px');
    expect(screen.queryByTestId('timeline-ring-boss-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('timeline-diamond-boss-1').className).toContain('glow-track');
    expect(hiddenItems()).toEqual([
      'Start — 00:00:00 — current',
      'Boss 1 — purple — 05:00:00 — next',
    ]);
  });

  it('moves the track, marks past/current/future nodes, and updates the hidden list at 05:00', () => {
    const { handleRef } = renderHud();

    write(handleRef, 300_000);

    expect(timelineTrack().style.transform).toBe('translate3d(0px, 0, 0)');

    expect(timelineNodes().map((node) => node.dataset['timelineNode'])).toEqual([
      'start',
      'boss-1',
      'boss-2',
    ]);
    expect(timelineNode('start')).toHaveAttribute('data-state', 'past');
    expect(timelineNode('start').className).toContain('opacity-35');
    expect(screen.getByTestId('timeline-diamond-start').className).not.toContain('glow-track');
    expect(timelineNode('boss-1')).toHaveAttribute('data-state', 'current');
    expect(screen.getByTestId('timeline-ring-boss-1')).toBeInTheDocument();
    expect(timelineNode('boss-2')).toHaveAttribute('data-state', 'future');
    expect(screen.getByTestId('timeline-diamond-boss-2').className).toContain('glow-track');
    expect(hiddenItems()).toEqual([
      'Start — 00:00:00 — passed',
      'Boss 1 — purple — 05:00:00 — current',
      'Boss 2 — green — 10:00:00 — next',
    ]);
  });

  it('writes position changes without re-rendering the visible node set', () => {
    const { handleRef } = renderHud();

    write(handleRef, 300_000);

    const start = timelineNode('start');
    const bossOne = timelineNode('boss-1');
    const list = screen.getByTestId('timeline-list');
    const listMarkup = list.innerHTML;

    write(handleRef, 300_001);

    expect(timelineNode('start')).toBe(start);
    expect(timelineNode('boss-1')).toBe(bossOne);
    expect(list.innerHTML).toBe(listMarkup);
    expect(timelineTrack().style.transform).not.toBe('translate3d(0px, 0, 0)');
  });

  it('drops nodes that leave the 10-minute window', () => {
    const { handleRef } = renderHud();

    write(handleRef, 600_000);

    expect(timelineNodes().map((node) => node.dataset['timelineNode'])).toEqual([
      'boss-1',
      'boss-2',
      'boss-3',
    ]);
    expect(hiddenItems()).toEqual([
      'Boss 1 — purple — 05:00:00 — passed',
      'Boss 2 — green — 10:00:00 — current',
      'Boss 3 — orange — 15:00:00 — next',
    ]);
  });

  it('renders the track, playhead, and legend with the approved tokens', () => {
    renderHud();

    const trackLine = screen.getByTestId('timeline-track-line');
    const playhead = screen.getByTestId('timeline-playhead');

    expect(trackLine.className).toContain('bg-track');
    expect(trackLine.className).toContain('text-track');
    expect(trackLine.className).toContain('glow-track');
    expect(playhead.className).toContain('bg-cyan');
    expect(playhead.className).not.toContain('glow-track');
    expect(screen.getByText('START')).toBeInTheDocument();
    expect(screen.getByText('BOSS CYCLE:')).toBeInTheDocument();
    expect(screen.getByText('PURPLE')).toBeInTheDocument();
    expect(screen.getByText('GREEN')).toBeInTheDocument();
    expect(screen.getByText('ORANGE')).toBeInTheDocument();
  });
});

describe('RunHud boss banner', () => {
  it('renders nothing when the banner is null', () => {
    renderHud();

    expect(screen.queryByTestId('boss-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces the boss color and milestone once as a polite status', () => {
    renderHud({ banner: { bossIndex: 1, color: 'purple' } });

    const banner = screen.getByTestId('boss-banner');
    const status = screen.getByRole('status');

    expect(banner).toHaveAttribute('data-boss-index', '1');
    expect(banner).toHaveAttribute('data-boss-color', 'purple');
    expect(banner.className).toContain('pointer-events-none');
    expect(banner.className).toContain('text-boss-purple');
    expect(banner.className).toContain('glow-hud');
    expect(banner.className).toContain('w-80');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('/// BOSS MARKER');
    expect(status).toHaveTextContent('PURPLE');
    expect(status).toHaveTextContent('05:00');
    expect(status).not.toHaveTextContent(/countdown/i);
  });

  it('uses the boss color, flash, and milestone for later bosses', () => {
    renderHud({ banner: { bossIndex: 2, color: 'green' } });

    const banner = screen.getByTestId('boss-banner');

    expect(banner).toHaveAttribute('data-boss-color', 'green');
    expect(banner.className).toContain('text-boss-green');
    expect(screen.getByRole('status')).toHaveTextContent('GREEN');
    expect(screen.getByRole('status')).toHaveTextContent('10:00');
    expect(screen.getByTestId('boss-glitch').className).toContain('motion-reduce:hidden');
  });

  it('dims the timeline visual and legend while the banner is visible', () => {
    renderHud({ banner: { bossIndex: 1, color: 'purple' } });

    const visual = screen.getByTestId('timeline-visual');
    const list = screen.getByTestId('timeline-list');

    expect(visual).toHaveClass('opacity-35');
    expect(list.className).not.toContain('opacity-35');
  });

  it('hides the decorative glitch strip under the in-app reduced-motion setting', () => {
    enableReducedMotion();
    renderHud({ banner: { bossIndex: 1, color: 'purple' } });

    const banner = screen.getByTestId('boss-banner');

    expect(banner).toHaveAttribute('data-reduced-motion', 'true');
    expect(screen.queryByTestId('boss-glitch')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('PURPLE');
  });
});

describe('RunHud pause control', () => {
  it('renders a 44px labelled pause button as the HUD’s only tab stop', () => {
    renderHud();

    const hud = screen.getByTestId('run-hud');
    const pause = screen.getByRole('button', { name: 'Pause menu' });
    const buttons = within(hud).getAllByRole('button');

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toBe(pause);
    expect(within(hud).queryByRole('link')).not.toBeInTheDocument();
    expect(within(hud).queryByRole('slider')).not.toBeInTheDocument();
    expect(within(hud).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(hud).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(pause).toHaveAttribute('aria-expanded', 'false');
    expect(pause).toHaveAttribute('aria-controls', 'pause-menu');
    expect(pause.className).toContain('size-11');
    expect(pause.className).toContain('focus-visible:[--clip-border:var(--color-cyan)]');
    expect(pause.className).not.toContain('glow-');
    expect(pause.className).not.toContain('shadow-glow');
    expect(screen.getByTestId('pause-glyph')).toHaveAttribute('aria-hidden', 'true');
  });

  it('reports the paused state and calls onPause without anchoring the joystick', () => {
    const onPause = vi.fn();
    const pointerDown = vi.fn();

    renderHud({ isPaused: true, onPause });

    const pause = screen.getByRole('button', { name: 'Pause menu' });

    expect(pause).toHaveAttribute('aria-expanded', 'true');

    document.addEventListener('pointerdown', pointerDown);
    fireEvent.pointerDown(pause);
    document.removeEventListener('pointerdown', pointerDown);

    expect(pointerDown).not.toHaveBeenCalled();

    fireEvent.click(pause);

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('focuses the pause button through the handle and hides it once the run is over', () => {
    const { handleRef } = renderHud();
    const pause = screen.getByRole('button', { name: 'Pause menu' });

    act(() => {
      handleRef.current?.focusPauseButton();
    });

    expect(pause).toHaveFocus();
  });

  it('does not render the pause control when the run is over', () => {
    renderHud({ showPause: false });

    expect(screen.queryByRole('button', { name: 'Pause menu' })).not.toBeInTheDocument();
  });
});
