import {
  BOSS_COLORS,
  BOSS_INTERVAL_MS,
  NODE_CLIP_PAD_PX,
  PLAYHEAD_X_PX,
  TIMELINE_WIDTH_PX,
  TIMELINE_WINDOW_MS,
  formatElapsed,
  type BossColor,
  type RunState,
} from './run';

export type TimelineNodeKind = 'start' | 'boss';
export type TimelineNodeState = 'past' | 'current' | 'future';

export interface TimelineNode {
  readonly id: string;
  readonly kind: TimelineNodeKind;
  readonly atMs: number;
  readonly xPx: number;
  readonly label: string;
  readonly colorName?: BossColor;
  readonly state: TimelineNodeState;
}

export interface TimelineView {
  readonly nodes: readonly TimelineNode[];
  readonly trackOffsetPx: number;
}

const VISIBLE_HALF_WINDOW_MS =
  ((PLAYHEAD_X_PX + NODE_CLIP_PAD_PX) * TIMELINE_WINDOW_MS) / TIMELINE_WIDTH_PX;

export function getTrackOffset(elapsedMs: number): number {
  return PLAYHEAD_X_PX - (elapsedMs * TIMELINE_WIDTH_PX) / TIMELINE_WINDOW_MS;
}

export function getTimelineNodes(run: RunState): TimelineView {
  const trackOffsetPx = getTrackOffset(run.elapsedMs);
  const activeBossIndex = run.banner?.bossIndex ?? null;
  const nodes: TimelineNode[] = [];

  const startXPx = trackOffsetPx;
  if (isVisibleTimelineNode({ xPx: startXPx })) {
    nodes.push({
      id: 'start',
      kind: 'start',
      atMs: 0,
      xPx: startXPx,
      label: `Start — ${formatElapsed(0).text}`,
      state: getNodeState(0, run.elapsedMs, run.elapsedMs === 0),
    });
  }

  const firstBossIndex = Math.max(
    1,
    Math.ceil((run.elapsedMs - VISIBLE_HALF_WINDOW_MS) / BOSS_INTERVAL_MS),
  );
  const lastBossIndex = Math.floor((run.elapsedMs + VISIBLE_HALF_WINDOW_MS) / BOSS_INTERVAL_MS);

  for (let bossIndex = firstBossIndex; bossIndex <= lastBossIndex; bossIndex += 1) {
    const atMs = bossIndex * BOSS_INTERVAL_MS;
    const xPx = trackOffsetPx + (atMs * TIMELINE_WIDTH_PX) / TIMELINE_WINDOW_MS;

    if (!isVisibleTimelineNode({ xPx })) {
      continue;
    }

    const colorName = BOSS_COLORS[(bossIndex - 1) % BOSS_COLORS.length] ?? BOSS_COLORS[0];

    nodes.push({
      id: `boss-${bossIndex}`,
      kind: 'boss',
      atMs,
      xPx,
      label: `Boss ${bossIndex} — ${colorName} — ${formatElapsed(atMs).text}`,
      colorName,
      state: getNodeState(atMs, run.elapsedMs, bossIndex === activeBossIndex),
    });
  }

  return {
    nodes,
    trackOffsetPx,
  };
}

export function isVisibleTimelineNode(node: Pick<TimelineNode, 'xPx'>): boolean {
  return node.xPx >= -NODE_CLIP_PAD_PX && node.xPx <= TIMELINE_WIDTH_PX + NODE_CLIP_PAD_PX;
}

function getNodeState(atMs: number, elapsedMs: number, isCurrent: boolean): TimelineNodeState {
  if (isCurrent) {
    return 'current';
  }

  return atMs <= elapsedMs ? 'past' : 'future';
}
