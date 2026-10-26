import { describe, expect, it } from 'vitest';

import {
  BOSS_BANNER_MS,
  BOSS_INTERVAL_MS,
  NODE_CLIP_PAD_PX,
  PLAYHEAD_X_PX,
  TIMELINE_WIDTH_PX,
  TIMELINE_WINDOW_MS,
  advanceRun,
  createRun,
  endRun,
  type RunState,
} from './run';
import {
  getTimelineNodes,
  getTrackOffset,
  isVisibleTimelineNode,
  type TimelineNode,
  type TimelineView,
} from './timeline';

function advanceTo(elapsedMs: number): RunState {
  return advanceRun(createRun(7), elapsedMs);
}

function findNode(view: TimelineView, id: string): TimelineNode {
  const node = view.nodes.find((candidate) => candidate.id === id);

  if (node === undefined) {
    throw new Error(`Missing timeline node: ${id}`);
  }

  return node;
}

describe('timeline geometry', () => {
  it('maps 600,000 ms to 320 px with a fixed 160 px playhead', () => {
    expect(getTrackOffset(0)).toBe(160);
    expect(getTrackOffset(150_000)).toBe(80);
    expect(getTrackOffset(300_000)).toBe(0);
    expect(getTrackOffset(600_000)).toBe(-160);
    expect(TIMELINE_WIDTH_PX).toBe(320);
    expect(TIMELINE_WINDOW_MS).toBe(600_000);
    expect(PLAYHEAD_X_PX).toBe(160);
  });

  it('positions nodes from the track offset', () => {
    const view = getTimelineNodes(advanceTo(123_456));

    expect(view.trackOffsetPx).toBe(getTrackOffset(123_456));

    for (const node of view.nodes) {
      expect(node.xPx).toBeCloseTo(
        view.trackOffsetPx + (node.atMs * TIMELINE_WIDTH_PX) / TIMELINE_WINDOW_MS,
      );
    }
  });

  it('includes nodes exactly on the clip padding and excludes them beyond it', () => {
    expect(isVisibleTimelineNode({ xPx: -NODE_CLIP_PAD_PX })).toBe(true);
    expect(isVisibleTimelineNode({ xPx: TIMELINE_WIDTH_PX + NODE_CLIP_PAD_PX })).toBe(true);
    expect(isVisibleTimelineNode({ xPx: -NODE_CLIP_PAD_PX - 0.01 })).toBe(false);
    expect(isVisibleTimelineNode({ xPx: TIMELINE_WIDTH_PX + NODE_CLIP_PAD_PX + 0.01 })).toBe(false);
  });
});

describe('getTimelineNodes', () => {
  it('emits the current start and the first boss at t = 0', () => {
    const view = getTimelineNodes(createRun(7));

    expect(view.trackOffsetPx).toBe(160);
    expect(view.nodes.map((node) => node.id)).toEqual(['start', 'boss-1']);
    expect(findNode(view, 'start')).toEqual({
      id: 'start',
      kind: 'start',
      atMs: 0,
      xPx: 160,
      label: 'Start — 00:00:00',
      state: 'current',
    });
    expect(findNode(view, 'boss-1')).toEqual({
      id: 'boss-1',
      kind: 'boss',
      atMs: 300_000,
      xPx: 320,
      label: 'Boss 1 — purple — 05:00:00',
      colorName: 'purple',
      state: 'future',
    });
  });

  it('positions the start and two bosses at 300,000 ms', () => {
    const view = getTimelineNodes(advanceTo(BOSS_INTERVAL_MS));

    expect(view.trackOffsetPx).toBe(0);
    expect(view.nodes.map((node) => node.id)).toEqual(['start', 'boss-1', 'boss-2']);
    expect(findNode(view, 'start')).toMatchObject({ xPx: 0, state: 'past' });
    expect(findNode(view, 'boss-1')).toMatchObject({
      xPx: 160,
      colorName: 'purple',
      state: 'current',
    });
    expect(findNode(view, 'boss-2')).toMatchObject({
      xPx: 320,
      colorName: 'green',
      state: 'future',
    });
  });

  it('drops the start and keeps three bosses at 600,000 ms', () => {
    const view = getTimelineNodes(advanceTo(600_000));

    expect(view.trackOffsetPx).toBe(-160);
    expect(view.nodes.map((node) => node.id)).toEqual(['boss-1', 'boss-2', 'boss-3']);
    expect(findNode(view, 'boss-1')).toMatchObject({ xPx: 0, state: 'past' });
    expect(findNode(view, 'boss-2')).toMatchObject({
      xPx: 160,
      colorName: 'green',
      state: 'current',
    });
    expect(findNode(view, 'boss-3')).toMatchObject({
      xPx: 320,
      colorName: 'orange',
      state: 'future',
    });
  });

  it('makes the start current only at exactly zero', () => {
    expect(findNode(getTimelineNodes(createRun(7)), 'start').state).toBe('current');
    expect(findNode(getTimelineNodes(advanceTo(1)), 'start').state).toBe('past');
  });

  it('keeps a boss current only while its banner is active', () => {
    const started = advanceTo(BOSS_INTERVAL_MS);

    expect(findNode(getTimelineNodes(started), 'boss-1').state).toBe('current');

    const expired = advanceRun(started, BOSS_BANNER_MS);
    const view = getTimelineNodes(expired);

    expect(findNode(view, 'boss-1').state).toBe('past');
    expect(view.nodes.some((node) => node.state === 'current')).toBe(false);
  });

  it('drops every current node when the run is over', () => {
    const over = endRun(advanceTo(BOSS_INTERVAL_MS), BOSS_INTERVAL_MS);
    const view = getTimelineNodes(over);

    expect(findNode(view, 'boss-1').state).toBe('past');
    expect(view.nodes.some((node) => node.state === 'current')).toBe(false);
  });

  it('keeps an entering and leaving node inside the clip padding', () => {
    const startAtEdge = getTimelineNodes(advanceTo(322_500));

    expect(findNode(startAtEdge, 'start').xPx).toBe(-12);

    const startPastEdge = getTimelineNodes(advanceTo(322_501));

    expect(startPastEdge.nodes.some((node) => node.id === 'start')).toBe(false);

    const bossAtEntry = getTimelineNodes(advanceTo(277_500));

    expect(findNode(bossAtEntry, 'boss-2').xPx).toBe(332);

    const bossBeforeEntry = getTimelineNodes(advanceTo(277_499));

    expect(bossBeforeEntry.nodes.some((node) => node.id === 'boss-2')).toBe(false);

    const bossAtExit = getTimelineNodes(advanceTo(622_500));

    expect(findNode(bossAtExit, 'boss-1').xPx).toBe(-12);

    const bossPastExit = getTimelineNodes(advanceTo(622_501));

    expect(bossPastExit.nodes.some((node) => node.id === 'boss-1')).toBe(false);
  });

  it('labels boss nodes with their index, color, and mark time', () => {
    const view = getTimelineNodes(advanceTo(1_200_000));

    expect(findNode(view, 'boss-3')).toMatchObject({
      atMs: 900_000,
      label: 'Boss 3 — orange — 15:00:00',
      colorName: 'orange',
      state: 'past',
    });
    expect(findNode(view, 'boss-4')).toMatchObject({
      atMs: 1_200_000,
      label: 'Boss 4 — purple — 20:00:00',
      colorName: 'purple',
      state: 'current',
    });
    expect(findNode(view, 'boss-5')).toMatchObject({
      atMs: 1_500_000,
      label: 'Boss 5 — green — 25:00:00',
      colorName: 'green',
      state: 'future',
    });
  });

  it('emits only start and boss placeholder kinds in this slice', () => {
    const view = getTimelineNodes(advanceTo(BOSS_INTERVAL_MS));

    expect(view.nodes.map((node) => node.kind)).toEqual(['start', 'boss', 'boss']);
  });

  it('generates only the visible window at long elapsed times', () => {
    const view = getTimelineNodes(advanceTo(6_000_000));

    expect(view.nodes.map((node) => node.id)).toEqual(['boss-19', 'boss-20', 'boss-21']);
    expect(view.nodes.some((node) => node.kind === 'start')).toBe(false);
    expect(view.nodes.every((node) => node.kind === 'boss')).toBe(true);
  });

  it('is deterministic and does not mutate the run', () => {
    const run = advanceTo(300_000);
    const snapshot = { ...run };

    expect(getTimelineNodes(run)).toEqual(getTimelineNodes(run));
    expect(run).toEqual(snapshot);
  });
});
