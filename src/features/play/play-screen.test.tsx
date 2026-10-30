import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SETTINGS_STORAGE_KEY } from '@/features/settings/settings-storage';
import { createEnemyWorld, stepEnemies } from '@/game/enemy-world';
import type { EnemyWorld } from '@/game/enemy-world';
import type * as EnemyWorldModule from '@/game/enemy-world';
import { createEmptyProgression } from '@/game/progression';
import type { ProgressionData } from '@/game/progression';
import { SAVE_STORAGE_KEY, createSave, serializeSave } from '@/game/save';
import { renderWithProviders } from '@/test/render';

import { PlayScreen } from './play-screen';

vi.mock('@/game/enemy-world', async (importOriginal) => {
  const actual = await importOriginal<typeof EnemyWorldModule>();

  return {
    ...actual,
    stepEnemies: vi.fn(actual.stepEnemies),
  };
});

const actualStepEnemies = vi.mocked(stepEnemies).getMockImplementation();

let portraitState = false;

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

function setTouchDevice(touch: boolean): void {
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: touch ? 1 : 0,
  });
}

function stubPortrait(initial: boolean): void {
  portraitState = initial;
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
    createMediaQueryList(query, () => portraitState && query.includes('portrait')),
  );
}

function changePortrait(portrait: boolean): void {
  portraitState = portrait;
  fireEvent(window, new Event('resize'));
}

function expectEnemyLayer(): void {
  const layer = screen.getByTestId('enemy-layer');

  expect(layer).toHaveAttribute('aria-hidden', 'true');
  expect(layer.className).toContain('pointer-events-none');
  expect(layer.className).toContain('z-20');
  expect(screen.getAllByTestId('enemy-body')).toHaveLength(36);
  expect(screen.getAllByTestId('enemy-warning')).toHaveLength(6);
  expect(screen.getAllByTestId('enemy-beam')).toHaveLength(6);
}

function expectRunHud(): void {
  const hud = screen.getByTestId('run-hud');

  expect(hud).toHaveAttribute('data-run-hud');
  expect(hud.className).toContain('pointer-events-none');
  expect(hud.className).toContain('z-30');
  expect(screen.getByRole('timer')).toHaveTextContent('00:00:00');
  expect(screen.getByText('RUN TIME')).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Blue points: 0' })).toBeInTheDocument();
  expect(screen.getByText('BOSS CYCLE:')).toBeInTheDocument();
  expect(screen.getByTestId('run-timeline')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pause menu' })).toBeInTheDocument();
}

function seedSave(overrides: Partial<ProgressionData> = {}): void {
  const data = { ...createEmptyProgression(), ...overrides };

  window.localStorage.setItem(
    SAVE_STORAGE_KEY,
    serializeSave(createSave(data, '2026-10-29T12:00:00.000Z')),
  );
}

function stubPlayRects(width = 1000, height = 600, safeLeft = 21, safeTop = 11): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.getAttribute('data-testid') === 'enemy-layer') {
      return new DOMRect(0, 0, width, height);
    }

    if (this.getAttribute('data-testid') === 'arena') {
      const widthMatch = /([\d.]+)px/.exec(this.parentElement?.style.width ?? '');
      const outerSize = widthMatch === null ? 0 : Number(widthMatch[1]);
      const innerSize = Math.max(0, outerSize - 4);
      const left = safeLeft + (width - safeLeft * 2 - innerSize) / 2;
      const top = safeTop + (height - safeTop * 2 - innerSize) / 2;

      return new DOMRect(left, top, innerSize, innerSize);
    }

    return new DOMRect();
  });
}

function stubAnimationFrames() {
  const frames: FrameRequestCallback[] = [];

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  return frames;
}

function advanceFrame(frames: readonly FrameRequestCallback[], index: number, deltaMs = 50): void {
  const frame = frames[index];

  expect(frame).toBeDefined();

  if (frame === undefined) {
    return;
  }

  act(() => {
    frame(performance.now() + deltaMs);
  });
}

function advanceLatestFrame(frames: readonly FrameRequestCallback[], deltaMs = 50): void {
  advanceFrame(frames, frames.length - 1, deltaMs);
}

function pressRightMouse(element: Element, x = 400, y = 300): void {
  fireEvent.pointerDown(element, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 2,
    buttons: 2,
    clientX: x,
    clientY: y,
  });
}

function releaseRightMouse(): void {
  fireEvent.pointerUp(window, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 2,
    clientX: 400,
    clientY: 300,
  });
}

function seedReflectRun(
  overrides: Partial<ProgressionData['upgrades']> = {},
  barrierCount = 0,
): void {
  seedSave({
    upgrades: {
      ...createEmptyProgression().upgrades,
      barrierCount,
      ...overrides,
    },
  });
}

function worldWithRedAt(x: number, y: number): EnemyWorld {
  const base = createEnemyWorld(1);
  const slots = [...base.slots];

  slots[0] = {
    id: 0,
    kind: 'red-square',
    x,
    y,
    dirX: 0,
    dirY: 0,
    speedPxPerSec: 0,
    sizePx: 32,
    spawnSide: 'left',
    spawnedAtMs: 0,
    enteredViewport: true,
    damagedPlayer: false,
  };

  return {
    ...base,
    slots,
    nextRedSpawnAtMs: 100_000,
    nextTriangleSpawnAtMs: 100_000,
  };
}

function worldWithWarningTriangle(): EnemyWorld {
  const base = createEnemyWorld(1);
  const slots = [...base.slots];

  slots[0] = {
    id: 0,
    kind: 'orange-triangle',
    phase: 'charging',
    x: 0,
    y: -200,
    stopX: 0,
    stopY: -200,
    aimX: 0,
    aimY: 1,
    approachSpeedPxPerSec: 0,
    exitSpeedPxPerSec: 0,
    spawnedAtMs: 0,
    arrivedAtMs: 500,
    chargeEndsAtMs: 1_000,
    beamEndsAtMs: null,
    lane: {
      originX: 0,
      originY: -200,
      dirX: 0,
      dirY: 1,
      widthPx: 57.6,
      lengthPx: 400,
    },
    sizePx: 40,
    enteredViewport: true,
    damagedPlayer: false,
  };

  return {
    ...base,
    slots,
    nextRedSpawnAtMs: 100_000,
    nextTriangleSpawnAtMs: 100_000,
  };
}

describe('PlayScreen', () => {
  beforeEach(() => {
    portraitState = false;
    setTouchDevice(false);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    if (actualStepEnemies !== undefined) {
      vi.mocked(stepEnemies).mockImplementation(actualStepEnemies);
    }

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the play field, enemy layer, HUD, and the pause control on desktop', () => {
    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    expect(playField).toBeInTheDocument();
    expect(playField).toHaveAttribute('tabindex', '-1');
    expect(playField).not.toHaveAttribute('inert');
    expect(screen.getByRole('heading', { level: 1, name: /play field/i })).toBeInTheDocument();
    expect(screen.getByText(/move with w a s d/i)).toBeInTheDocument();
    expect(screen.getByText(/it reflects an orange beam only when/i)).toBeInTheDocument();
    expect(screen.getByText(/reflected beams are instant cyan lasers/i)).toBeInTheDocument();
    expect(screen.getByText(/charging warning paths/i)).toBeInTheDocument();
    expect(screen.getByText(/triangle body contact also damages/i)).toBeInTheDocument();
    expectEnemyLayer();
    expect(screen.getAllByTestId('reflected-beam')).toHaveLength(6);
    expect(screen.getAllByTestId('reflection-preview')).toHaveLength(6);
    expect(screen.getAllByTestId('explosion')).toHaveLength(12);
    expectRunHud();
    expect(screen.getByRole('button', { name: 'Pause menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('boss-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portrait-gate')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    expect(screen.getByText(/barrier notches/i)).toBeInTheDocument();
    expect(screen.getByText(/this run has no reflect charges/i)).toBeInTheDocument();
    expect(screen.getByText(/this run has no barrier/i)).toBeInTheDocument();
  });

  it('blocks the run with no board or HUD when the save is unreadable', () => {
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{not json');

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const gate = screen.getByRole('alert');

    expect(gate).toHaveTextContent('SAVED PROGRESS COULD NOT BE READ');
    expect(gate).toHaveTextContent('NO RUN STARTED // NO SAVE WRITTEN');
    expect(gate).toHaveFocus();
    expect(screen.queryByRole('region', { name: 'Play field' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('run-hud')).not.toBeInTheDocument();
    expect(screen.queryByTestId('enemy-layer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(screen.getByRole('link', { name: 'Back to title' })).toHaveAttribute('href', '/');
  });

  it('blocks the run without a settings repair when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const gate = screen.getByRole('alert');

    expect(gate).toHaveTextContent('LOCAL STORAGE IS UNAVAILABLE');
    expect(gate).toHaveTextContent('NO RUN STARTED // STORAGE BLOCKED');
    expect(screen.queryByRole('region', { name: 'Play field' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('run-hud')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to title' })).toBeInTheDocument();
  });

  it('keeps the save gate below the portrait gate and restores its focus on landscape', async () => {
    stubPortrait(true);
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{not json');

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const gate = screen.getByRole('alert');
    const portrait = screen.getByTestId('portrait-gate');

    expect(gate).toHaveAttribute('inert');
    expect(gate.className).toContain('z-[150]');
    expect(portrait.className).toContain('z-[200]');
    expect(gate).not.toHaveFocus();

    changePortrait(false);

    await waitFor(() => {
      expect(gate).not.toHaveAttribute('inert');
      expect(gate).toHaveFocus();
    });
    expect(screen.queryByTestId('portrait-gate')).not.toBeInTheDocument();
  });

  it('hides the HUD behind the START gate on touch and shows it after the tap', async () => {
    setTouchDevice(true);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const start = screen.getByRole('button', { name: /start/i });

    expect(start).toBeInTheDocument();
    expect(screen.queryByTestId('run-hud')).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expectEnemyLayer();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(start);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

    expectRunHud();
    expectEnemyLayer();
  });

  it('keeps the run mounted and inert behind the portrait overlay', async () => {
    stubPortrait(true);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    expect(
      screen.getByRole('heading', { level: 1, name: /rotate to landscape/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('portrait-gate')).toBeInTheDocument();
    expect(playField).toBeInTheDocument();
    expect(playField).toHaveAttribute('inert');
    expectEnemyLayer();
    expect(screen.getByTestId('run-hud')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the pause menu from the pause button and resumes with focus return', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const pauseButton = screen.getByRole('button', { name: 'Pause menu' });

    await user.click(pauseButton);

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('id', 'pause-menu');
    expect(screen.getByRole('heading', { level: 2, name: 'PAUSED' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();
    expect(pauseButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: /resume/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(pauseButton).toHaveFocus();
    });
    expect(pauseButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the pause menu on Escape and resumes through the dialog cancel', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const pauseButton = screen.getByRole('button', { name: 'Pause menu' });

    await user.keyboard('{Escape}');

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('id', 'pause-menu');
    expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(pauseButton).toHaveFocus();
    });
  });

  it('restarts from the pause confirmation and focuses the play field root', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));
    await user.click(await screen.findByRole('button', { name: /restart/i }));
    await user.click(screen.getByRole('button', { name: 'Confirm restart' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(playField).toHaveFocus();
    });
    expect(screen.getByRole('timer')).toHaveTextContent('00:00:00');
    expect(screen.getByRole('button', { name: 'Pause menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens the pause menu once when portrait returns and stays paused', async () => {
    stubPortrait(true);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    expect(playField).toHaveAttribute('inert');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    changePortrait(false);

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('id', 'pause-menu');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();
    expect(playField).not.toHaveAttribute('inert');

    changePortrait(false);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAttribute('open');

    await user.click(screen.getByRole('button', { name: /resume/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('suspends the open pause menu while portrait and restores it once', async () => {
    stubPortrait(false);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));

    const dialog = await screen.findByRole('dialog');
    const pausedHeading = screen.getByRole('heading', { level: 2, name: 'PAUSED' });

    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();

    changePortrait(true);

    expect(dialog).not.toHaveAttribute('open');
    expect(screen.getByTestId('portrait-gate')).toBeInTheDocument();
    expect(playField).toHaveAttribute('inert');
    expect(pausedHeading).toBeInTheDocument();

    changePortrait(false);

    expect(dialog).toHaveAttribute('open');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume/i })).toHaveFocus();
    });
    expect(playField).not.toHaveAttribute('inert');
  });

  it('locks the pause Skill Tree item without navigating', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));

    const skillTree = await screen.findByRole('button', { name: /skill tree/i });

    expect(skillTree).toHaveAttribute('aria-disabled', 'true');

    await user.click(skillTree);

    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(screen.queryByRole('heading', { level: 1, name: /skill/i })).not.toBeInTheDocument();
  });

  it('freezes on window blur without opening a pause menu', () => {
    renderWithProviders(<PlayScreen />, { route: '/play' });

    fireEvent.blur(window);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    fireEvent.focus(window);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mounts the run-over on death, suspends it in portrait, and restores it on landscape', async () => {
    stubPortrait(false);
    const user = userEvent.setup();
    const frames = stubAnimationFrames();

    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: { slotId: 0, kind: 'red-square', atMs: 20 },
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const playField = screen.getByRole('region', { name: 'Play field' });
    const frame = frames[0];

    expect(playField).not.toHaveAttribute('inert');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(frame).toBeDefined();

    if (frame === undefined) {
      return;
    }

    act(() => {
      frame(performance.now() + 100);
    });

    const dialog = await screen.findByRole('dialog');
    const heading = screen.getByRole('heading', { level: 2, name: 'SIGNAL LOST' });

    expect(playField).toHaveAttribute('inert');
    expect(heading).toHaveFocus();
    expect(screen.getByRole('timer')).toHaveTextContent('00:00:02');
    expect(screen.getByTestId('run-hud').className).toContain('z-30');
    expect(screen.queryByRole('button', { name: 'Pause menu' })).not.toBeInTheDocument();
    expect(fireEvent.keyDown(window, { code: 'ArrowUp' })).toBe(true);

    changePortrait(true);

    expect(dialog).not.toHaveAttribute('open');
    expect(screen.getByTestId('portrait-gate')).toBeInTheDocument();
    expect(playField).toHaveAttribute('inert');
    expect(screen.queryByRole('heading', { level: 2, name: 'PAUSED' })).not.toBeInTheDocument();

    changePortrait(false);

    expect(dialog).toHaveAttribute('open');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(screen.queryByRole('heading', { level: 2, name: 'PAUSED' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(playField).not.toHaveAttribute('inert');

    await waitFor(() => {
      expect(playField).toHaveFocus();
    });

    expect(screen.getByRole('timer')).toHaveTextContent('00:00:00');
    expect(screen.getByRole('button', { name: 'Pause menu' })).toBeInTheDocument();
  });

  it('starts at full barrier from the captured loadout and absorbs red hits', async () => {
    stubPortrait(false);
    const frames = stubAnimationFrames();

    seedSave({
      upgrades: { ...createEmptyProgression().upgrades, barrierCount: 2 },
    });
    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: { slotId: 0, kind: 'red-square', atMs: 20 },
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const first = frames[0];

    expect(first).toBeDefined();

    if (first === undefined) {
      return;
    }

    act(() => {
      first(performance.now() + 50);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Play field' })).toBeInTheDocument();

    const second = frames[1];

    expect(second).toBeDefined();

    if (second === undefined) {
      return;
    }

    act(() => {
      second(performance.now() + 100);
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'SIGNAL LOST' })).toBeInTheDocument();
  });

  it('redirects Retry to the save gate when the re-read is blocked', async () => {
    stubPortrait(false);
    const user = userEvent.setup();
    const frames = stubAnimationFrames();

    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: { slotId: 0, kind: 'red-square', atMs: 20 },
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const frame = frames[0];

    expect(frame).toBeDefined();

    if (frame === undefined) {
      return;
    }

    act(() => {
      frame(performance.now() + 100);
    });

    await screen.findByRole('dialog');
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{not json');

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    const gate = await screen.findByRole('alert');

    expect(gate).toHaveTextContent('SAVED PROGRESS COULD NOT BE READ');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Play field' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('run-hud')).not.toBeInTheDocument();
  });

  it('redirects the confirmed pause Restart to the save gate when the re-read is blocked', async () => {
    stubPortrait(false);
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));
    await user.click(await screen.findByRole('button', { name: /restart/i }));

    window.localStorage.setItem(SAVE_STORAGE_KEY, '{not json');

    await user.click(screen.getByRole('button', { name: 'Confirm restart' }));

    const gate = await screen.findByRole('alert');

    expect(gate).toHaveTextContent('SAVED PROGRESS COULD NOT BE READ');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Play field' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'PAUSED' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm restart' })).not.toBeInTheDocument();
  });

  it('re-derives the loadout from a valid save on Retry', async () => {
    stubPortrait(false);
    const user = userEvent.setup();
    const frames = stubAnimationFrames();

    seedSave();

    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: { slotId: 0, kind: 'red-square', atMs: 20 },
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(screen.getByTestId('player-square')).toHaveStyle({ width: '64px' });

    const frame = frames[0];

    expect(frame).toBeDefined();

    if (frame === undefined) {
      return;
    }

    act(() => {
      frame(performance.now() + 100);
    });

    await screen.findByRole('dialog');

    seedSave({
      upgrades: { ...createEmptyProgression().upgrades, playerSize: 5 },
    });

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('player-square')).toHaveStyle({ width: '24px' });
  });

  it('centers the player in the new square arena when Retry changes Arena Size', async () => {
    stubPortrait(false);
    const user = userEvent.setup();
    const frames = stubAnimationFrames();

    stubPlayRects();
    seedSave();

    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: { slotId: 0, kind: 'red-square', atMs: 20 },
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(screen.getByTestId('player-square')).toHaveStyle({
      transform: 'translate3d(126px, 126px, 0)',
    });

    advanceLatestFrame(frames);

    await screen.findByRole('dialog');

    seedSave({
      upgrades: {
        ...createEmptyProgression().upgrades,
        arenaSize: 5,
        reflectCharges: 2,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('player-square')).toHaveStyle({
      transform: 'translate3d(176px, 176px, 0)',
    });

    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: null,
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    pressRightMouse(screen.getByRole('region', { name: 'Play field' }), 500, 100);
    advanceLatestFrame(frames);

    expect(screen.getByTestId('shield-line')).toHaveStyle({
      transform: 'translate3d(468px, 253px, 0) rotate(0rad)',
      opacity: '1',
    });
  });

  it('re-derives the loadout from a valid save on Restart', async () => {
    stubPortrait(false);
    const user = userEvent.setup();

    seedSave();
    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(screen.getByTestId('player-square')).toHaveStyle({ width: '64px' });
    expect(screen.queryByTestId('charge-ring')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));
    await user.click(await screen.findByRole('button', { name: /restart/i }));

    seedSave({
      upgrades: {
        ...createEmptyProgression().upgrades,
        playerSize: 5,
        reflectCharges: 2,
        barrierCount: 3,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Confirm restart' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('player-square')).toHaveStyle({ width: '24px' });
    expect(screen.getByTestId('charge-ring')).toBeInTheDocument();
    expect(screen.getByTestId('charge-count')).toHaveTextContent('2');
    const notches = screen.getAllByTestId('barrier-notch');

    expect(notches).toHaveLength(3);
    expect(notches.every((notch) => notch.getAttribute('data-filled') === 'true')).toBe(true);
    expect(screen.getByTestId('shield-line')).toHaveStyle({ opacity: '0' });
  });

  it('shows the shield line for a right-mouse hold and hides it on release', () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 2 });
    const frames = stubAnimationFrames();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    expect(line).toHaveStyle({ opacity: '0' });

    pressRightMouse(board);
    advanceFrame(frames, 0, 50);

    expect(line).toHaveStyle({ opacity: '1' });
    expect(line.style.transform).toContain('rotate(');

    releaseRightMouse();

    expect(line).toHaveStyle({ opacity: '0' });
    expect(fireEvent.contextMenu(board)).toBe(false);
  });

  it('spends a charge and shows an instant reflected beam', () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 2 });
    const frames = stubAnimationFrames();
    const world = createEnemyWorld(1);

    vi.mocked(stepEnemies).mockImplementation(() => ({
      world,
      hit: null,
      fires: [],
      reflectedFireSlotIds: [0],
      reflections: [
        {
          slotId: 0,
          originX: 400,
          originY: 300,
          contactX: 400,
          contactY: 300,
          incomingLengthPx: 120,
          dirX: 0,
          dirY: 1,
        },
      ],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const beams = screen.getAllByTestId('reflected-beam');

    expect(screen.getByTestId('charge-count')).toHaveTextContent('2');

    pressRightMouse(board);
    advanceFrame(frames, 0, 20);

    expect(screen.getByTestId('charge-count')).toHaveTextContent('1');
    expect(beams.some((beam) => beam.style.opacity === '1')).toBe(true);
    expect(screen.getByTestId('shield-line')).toHaveStyle({ opacity: '1' });
  });

  it('hides the shield and joystick state after the last charge is spent', () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();
    const world = createEnemyWorld(1);

    vi.mocked(stepEnemies).mockImplementation(() => ({
      world,
      hit: null,
      fires: [],
      reflectedFireSlotIds: [0],
      reflections: [
        {
          slotId: 0,
          originX: 400,
          originY: 300,
          contactX: 400,
          contactY: 300,
          incomingLengthPx: 120,
          dirX: 0,
          dirY: 1,
        },
      ],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    pressRightMouse(board);
    advanceFrame(frames, 0, 20);

    expect(screen.getByTestId('charge-count')).toHaveTextContent('0');
    expect(line).toHaveStyle({ opacity: '0' });

    releaseRightMouse();
    pressRightMouse(board);
    advanceFrame(frames, 1, 20);

    expect(line).toHaveStyle({ opacity: '0' });
  });

  it('wires an instant reflected beam kill to the enemy removal and explosion', () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();
    const world = worldWithRedAt(0, -46);

    vi.mocked(stepEnemies).mockImplementation(() => ({
      world,
      hit: null,
      fires: [],
      reflectedFireSlotIds: [0],
      reflections: [
        {
          slotId: 0,
          originX: 0,
          originY: -46,
          contactX: 0,
          contactY: -46,
          incomingLengthPx: 46,
          dirX: 0,
          dirY: 1,
        },
      ],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });

    pressRightMouse(board, 0, 0);
    advanceFrame(frames, 0, 20);

    expect(screen.getByTestId('charge-count')).toHaveTextContent('0');
    expect(screen.getByTestId('shield-line')).toHaveStyle({ opacity: '0' });
    expect(screen.getAllByTestId('enemy-body')[0]).toHaveStyle({ opacity: '0' });

    const explosions = screen.getAllByTestId('explosion');

    expect(
      explosions.some(
        (node) => node.getAttribute('data-kind') === 'red-square' && node.style.opacity !== '0',
      ),
    ).toBe(true);
  });

  it('clears reflected beams and explosions on Restart', async () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 2 });
    const frames = stubAnimationFrames();
    const user = userEvent.setup();
    const world = createEnemyWorld(1);

    vi.mocked(stepEnemies).mockImplementation(() => ({
      world,
      hit: null,
      fires: [],
      reflectedFireSlotIds: [0],
      reflections: [
        {
          slotId: 0,
          originX: 0,
          originY: -46,
          contactX: 0,
          contactY: -46,
          incomingLengthPx: 46,
          dirX: 0,
          dirY: 1,
        },
      ],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });

    pressRightMouse(board);
    advanceFrame(frames, 0, 20);

    expect(screen.getAllByTestId('reflected-beam').some((node) => node.style.opacity === '1')).toBe(
      true,
    );

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));
    await user.click(await screen.findByRole('button', { name: /restart/i }));
    await user.click(screen.getByRole('button', { name: 'Confirm restart' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(
      screen.getAllByTestId('reflected-beam').every((node) => node.style.opacity === '0'),
    ).toBe(true);
    expect(screen.getAllByTestId('explosion').every((node) => node.style.opacity === '0')).toBe(
      true,
    );
  });

  it('shows a reflection preview only while a warning would reflect', () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();
    const world = worldWithWarningTriangle();

    vi.mocked(stepEnemies).mockImplementation(() => ({
      world,
      hit: null,
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const previews = screen.getAllByTestId('reflection-preview');

    pressRightMouse(board, 0, 0);
    advanceFrame(frames, 0, 20);

    expect(previews.some((preview) => preview.style.opacity === '0.4')).toBe(true);

    releaseRightMouse();

    expect(previews.every((preview) => preview.style.opacity === '0')).toBe(true);
  });

  it('aims from the new pointer position after release and re-engage', () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    pressRightMouse(board, 500, 300);
    advanceFrame(frames, 0, 50);

    const eastAim = line.style.transform;

    expect(eastAim).toContain('rotate(');

    releaseRightMouse();
    pressRightMouse(board, 100, 300);
    advanceLatestFrame(frames, 50);

    expect(line.style.transform).toContain('rotate(');
    expect(line.style.transform).not.toBe(eastAim);
  });

  it('does not engage the shield on a left click or a right-click on the pause control', () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const pauseButton = screen.getByRole('button', { name: 'Pause menu' });
    const line = screen.getByTestId('shield-line');

    fireEvent.pointerDown(board, { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 });
    advanceFrame(frames, 0);

    expect(line).toHaveStyle({ opacity: '0' });

    fireEvent.pointerDown(pauseButton, {
      pointerId: 2,
      pointerType: 'mouse',
      button: 2,
      buttons: 2,
    });
    advanceFrame(frames, 1);

    expect(line).toHaveStyle({ opacity: '0' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides the shield on pause and requires a new press after resume', async () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    pressRightMouse(board);
    advanceFrame(frames, 0, 50);

    expect(line).toHaveStyle({ opacity: '1' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(line).toHaveStyle({ opacity: '0' });

    await user.click(screen.getByRole('button', { name: /resume/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(line).toHaveStyle({ opacity: '0' });

    advanceLatestFrame(frames);

    expect(line).toHaveStyle({ opacity: '0' });

    pressRightMouse(board);
    advanceLatestFrame(frames, 250);

    expect(line).toHaveStyle({ opacity: '1' });
  });

  it('hides the shield when window focus is lost', async () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    pressRightMouse(board);
    advanceFrame(frames, 0, 50);

    expect(line).toHaveStyle({ opacity: '1' });

    fireEvent(window, new Event('blur'));

    await waitFor(() => {
      expect(line).toHaveStyle({ opacity: '0' });
    });
  });

  it('hides the shield when portrait freezes the run', async () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    pressRightMouse(board);
    advanceFrame(frames, 0, 50);

    expect(line).toHaveStyle({ opacity: '1' });

    changePortrait(true);

    await waitFor(() => {
      expect(line).toHaveStyle({ opacity: '0' });
    });
    expect(screen.getByTestId('portrait-gate')).toBeInTheDocument();
  });

  it('hides the shield when a hit ends the run', async () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();

    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: { slotId: 0, kind: 'red-square', atMs: 20 },
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    pressRightMouse(board);
    advanceFrame(frames, 0, 100);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(line).toHaveStyle({ opacity: '0' });
    expect(screen.getByTestId('player-square')).not.toHaveClass('outline-2');
  });

  it('uses the first touch to move and the second to aim the shield', async () => {
    setTouchDevice(true);
    seedReflectRun({ reflectCharges: 2 });
    const frames = stubAnimationFrames();
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    await user.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    fireEvent.pointerDown(board, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100,
    });

    expect(screen.getByTestId('movement-joystick')).toBeInTheDocument();
    expect(screen.queryByTestId('shield-joystick')).not.toBeInTheDocument();

    fireEvent.pointerDown(board, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 300,
      clientY: 300,
    });

    advanceLatestFrame(frames);

    expect(screen.getByTestId('shield-joystick')).toBeInTheDocument();
    expect(line).toHaveStyle({ opacity: '1' });

    fireEvent.pointerUp(board, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100,
    });

    expect(screen.queryByTestId('movement-joystick')).not.toBeInTheDocument();
    expect(screen.getByTestId('shield-joystick')).toBeInTheDocument();

    fireEvent.pointerDown(board, {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 200,
      clientY: 200,
    });

    expect(screen.getByTestId('movement-joystick')).toBeInTheDocument();
    expect(screen.getByTestId('shield-joystick')).toBeInTheDocument();

    fireEvent.pointerUp(board, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 300,
      clientY: 300,
    });

    expect(screen.queryByTestId('shield-joystick')).not.toBeInTheDocument();
    expect(line).toHaveStyle({ opacity: '0' });
    expect(screen.getByTestId('movement-joystick')).toBeInTheDocument();
  });

  it('ignores the second touch at reflect level 0', async () => {
    setTouchDevice(true);
    const frames = stubAnimationFrames();
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    await user.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    fireEvent.pointerDown(board, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerDown(board, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 300,
      clientY: 300,
    });

    expect(screen.getByTestId('movement-joystick')).toBeInTheDocument();
    expect(screen.queryByTestId('shield-joystick')).not.toBeInTheDocument();

    advanceLatestFrame(frames);

    expect(line).toHaveStyle({ opacity: '0' });
  });

  it('hides both touch joysticks and the shield on pause', async () => {
    setTouchDevice(true);
    seedReflectRun({ reflectCharges: 1 });
    const frames = stubAnimationFrames();
    const user = userEvent.setup();

    renderWithProviders(<PlayScreen />, { route: '/play' });

    await user.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

    const board = screen.getByRole('region', { name: 'Play field' });
    const line = screen.getByTestId('shield-line');

    fireEvent.pointerDown(board, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerDown(board, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 300,
      clientY: 300,
    });

    advanceLatestFrame(frames);

    expect(screen.getByTestId('movement-joystick')).toBeInTheDocument();
    expect(screen.getByTestId('shield-joystick')).toBeInTheDocument();
    expect(line).toHaveStyle({ opacity: '1' });

    await user.click(screen.getByRole('button', { name: 'Pause menu' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('movement-joystick')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shield-joystick')).not.toBeInTheDocument();
    expect(line).toHaveStyle({ opacity: '0' });

    advanceLatestFrame(frames, 0);

    await user.click(screen.getByRole('button', { name: /resume/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('movement-joystick')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shield-joystick')).not.toBeInTheDocument();
    expect(line).toHaveStyle({ opacity: '0' });
  });

  it('renders the charge ring and full barrier notches from the loadout', () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 2 }, 2);

    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(screen.getByTestId('charge-ring')).toBeInTheDocument();
    expect(screen.getByTestId('charge-count')).toHaveTextContent('2');
    expect(screen.getByTestId('charge-ring-progress')).toHaveAttribute('stroke-dashoffset', '0');

    const notches = screen.getAllByTestId('barrier-notch');

    expect(notches).toHaveLength(2);
    expect(notches.every((notch) => notch.getAttribute('data-filled') === 'true')).toBe(true);
  });

  it('empties one barrier notch and plays the 120 ms hit cue for an absorbed hit', async () => {
    stubPortrait(false);
    seedReflectRun({}, 3);
    const frames = stubAnimationFrames();
    let callCount = 0;

    vi.mocked(stepEnemies).mockImplementation((world) => {
      const hit = callCount === 0;
      callCount += 1;

      return {
        world,
        hit: hit ? { slotId: 0, kind: 'red-square', atMs: 20 } : null,
        fires: [],
        reflectedFireSlotIds: [],
        reflections: [],
      };
    });

    renderWithProviders(<PlayScreen />, { route: '/play' });

    advanceFrame(frames, 0, 50);

    const player = screen.getByTestId('player-square');
    const notches = screen.getAllByTestId('barrier-notch');

    expect(notches).toHaveLength(3);
    expect(notches[0]).toHaveAttribute('data-filled', 'true');
    expect(notches[1]).toHaveAttribute('data-filled', 'true');
    expect(notches[2]).toHaveAttribute('data-filled', 'false');
    expect(player).toHaveClass('outline-2', 'outline-ink');

    await waitFor(() => {
      expect(player).not.toHaveClass('outline-2');
    });
    expect(player).not.toHaveAttribute('data-barrier-hit');
  });

  it('omits the barrier hit cue under reduced motion but still empties the notch', () => {
    stubPortrait(false);
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, reducedMotion: true, glowIntensity: 100 }),
    );
    seedReflectRun({}, 3);
    const frames = stubAnimationFrames();
    let callCount = 0;

    vi.mocked(stepEnemies).mockImplementation((world) => {
      const hit = callCount === 0;
      callCount += 1;

      return {
        world,
        hit: hit ? { slotId: 0, kind: 'red-square', atMs: 20 } : null,
        fires: [],
        reflectedFireSlotIds: [],
        reflections: [],
      };
    });

    renderWithProviders(<PlayScreen />, { route: '/play' });

    advanceFrame(frames, 0, 50);

    const player = screen.getByTestId('player-square');
    const notches = screen.getAllByTestId('barrier-notch');

    expect(notches[0]).toHaveAttribute('data-filled', 'true');
    expect(notches[1]).toHaveAttribute('data-filled', 'true');
    expect(notches[2]).toHaveAttribute('data-filled', 'false');
    expect(player).not.toHaveClass('outline-2');
    expect(player).not.toHaveAttribute('data-barrier-hit');
  });

  it('omits the barrier hit cue when only the system reduced-motion preference is set', () => {
    stubPortrait(false);
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      createMediaQueryList(query, () => query.includes('prefers-reduced-motion')),
    );
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, reducedMotion: false, glowIntensity: 100 }),
    );
    seedReflectRun({}, 3);
    const frames = stubAnimationFrames();
    let callCount = 0;

    vi.mocked(stepEnemies).mockImplementation((world) => {
      const hit = callCount === 0;
      callCount += 1;

      return {
        world,
        hit: hit ? { slotId: 0, kind: 'red-square', atMs: 20 } : null,
        fires: [],
        reflectedFireSlotIds: [],
        reflections: [],
      };
    });

    renderWithProviders(<PlayScreen />, { route: '/play' });

    advanceFrame(frames, 0, 50);

    const notches = screen.getAllByTestId('barrier-notch');

    expect(notches[0]).toHaveAttribute('data-filled', 'true');
    expect(notches[1]).toHaveAttribute('data-filled', 'true');
    expect(notches[2]).toHaveAttribute('data-filled', 'false');
    expect(screen.getByTestId('player-square')).not.toHaveClass('outline-2');
    expect(screen.getByTestId('player-square')).not.toHaveAttribute('data-barrier-hit');
  });

  it('resets charges and barrier from the new loadout on Retry', async () => {
    stubPortrait(false);
    seedReflectRun({ reflectCharges: 1 }, 3);
    const frames = stubAnimationFrames();
    const user = userEvent.setup();

    vi.mocked(stepEnemies).mockImplementation((world) => ({
      world,
      hit: { slotId: 0, kind: 'red-square', atMs: 20 },
      fires: [],
      reflectedFireSlotIds: [],
      reflections: [],
    }));

    renderWithProviders(<PlayScreen />, { route: '/play' });

    expect(screen.getByTestId('charge-count')).toHaveTextContent('1');
    expect(screen.getAllByTestId('barrier-notch')).toHaveLength(3);

    advanceFrame(frames, 0, 100);
    advanceFrame(frames, 1, 250);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    seedReflectRun({ reflectCharges: 3 }, 1);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByTestId('charge-count')).toHaveTextContent('3');
    expect(screen.getAllByTestId('barrier-notch')).toHaveLength(1);
    expect(screen.getByTestId('barrier-notch')).toHaveAttribute('data-filled', 'true');
  });
});
