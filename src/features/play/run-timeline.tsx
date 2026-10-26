import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { createRun, TIMELINE_WIDTH_PX, TIMELINE_WINDOW_MS } from '@/game/run';
import type { RunState } from '@/game/run';
import { getTimelineNodes, getTrackOffset } from '@/game/timeline';
import type { TimelineNode, TimelineNodeState } from '@/game/timeline';
import { cx } from '@/shared/lib/cx';

const NODE_SCALE_PX_PER_MS = TIMELINE_WIDTH_PX / TIMELINE_WINDOW_MS;
const INITIAL_NODES = getTimelineNodes(createRun(0)).nodes;
const INITIAL_SIGNATURE = nodeSignature(INITIAL_NODES);

const NODE_STATE_WORDS: Record<TimelineNodeState, string> = {
  past: 'passed',
  current: 'current',
  future: 'next',
};

const BOSS_FILL: Record<string, string> = {
  purple: 'bg-boss-purple',
  green: 'bg-boss-green',
  orange: 'bg-boss-orange',
};

const BOSS_TEXT: Record<string, string> = {
  purple: 'text-boss-purple',
  green: 'text-boss-green',
  orange: 'text-boss-orange',
};

const LEGEND_BOSS: readonly { readonly color: string; readonly label: string }[] = [
  { color: 'purple', label: 'PURPLE' },
  { color: 'green', label: 'GREEN' },
  { color: 'orange', label: 'ORANGE' },
];

export interface RunTimelineHandle {
  write(run: RunState): void;
}

interface RunTimelineProps {
  readonly dimmed?: boolean;
}

export const RunTimeline = forwardRef<RunTimelineHandle, RunTimelineProps>(function RunTimeline(
  { dimmed = false },
  ref,
) {
  const trackRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef(INITIAL_SIGNATURE);
  const [nodes, setNodes] = useState<readonly TimelineNode[]>(INITIAL_NODES);

  const write = useCallback((run: RunState) => {
    const view = getTimelineNodes(run);

    writeTrackTransform(trackRef.current, view.trackOffsetPx);

    const signature = nodeSignature(view.nodes);

    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      setNodes(view.nodes);
    }
  }, []);

  useImperativeHandle(ref, () => ({ write }), [write]);

  useLayoutEffect(() => {
    writeTrackTransform(trackRef.current, getTrackOffset(0));
  }, []);

  return (
    <div data-timeline="" data-testid="run-timeline" className="w-80 select-none">
      <div
        data-timeline-visual=""
        data-testid="timeline-visual"
        data-dimmed={dimmed ? 'true' : undefined}
        className={cx(dimmed && 'opacity-35')}
      >
        <div
          aria-hidden="true"
          data-timeline-strip=""
          className="relative h-5 w-80 overflow-hidden"
        >
          <div
            data-testid="timeline-track-line"
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-track text-track glow-track"
          />
          <div
            ref={trackRef}
            data-timeline-track=""
            data-testid="timeline-track"
            className="absolute inset-0 will-change-transform"
          >
            {nodes.map((node) => (
              <TimelineNodeMarker key={node.id} node={node} />
            ))}
          </div>
          <div
            data-timeline-playhead=""
            data-testid="timeline-playhead"
            className="absolute top-1/2 left-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-cyan"
          />
        </div>

        <div
          data-timeline-legend=""
          className="mt-1 flex items-center gap-3 font-mono text-[0.62rem] tracking-[0.04em] whitespace-nowrap text-muted uppercase"
        >
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 bg-ink clip-diamond" />
            START
          </span>
          <span className="flex items-center gap-1">
            BOSS CYCLE:
            {LEGEND_BOSS.map((boss) => (
              <span key={boss.color} className="flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className={cx('h-1.5 w-1.5 clip-diamond', BOSS_FILL[boss.color])}
                />
                {boss.label}
              </span>
            ))}
          </span>
        </div>
      </div>

      <ul
        data-timeline-list=""
        data-testid="timeline-list"
        aria-label="Timeline"
        className="sr-only"
      >
        {nodes.map((node) => (
          <li
            key={node.id}
            data-timeline-item={node.id}
            data-state={node.state}
            data-testid={`timeline-item-${node.id}`}
          >
            {node.label} — {NODE_STATE_WORDS[node.state]}
          </li>
        ))}
      </ul>
    </div>
  );
});

function TimelineNodeMarker({ node }: { readonly node: TimelineNode }) {
  const isPast = node.state === 'past';
  const isStart = node.kind === 'start';
  const colorName = node.colorName ?? 'ink';
  const fillClass = isStart ? 'bg-ink' : (BOSS_FILL[colorName] ?? 'bg-ink');
  const textClass = isStart ? 'text-ink' : (BOSS_TEXT[colorName] ?? 'text-ink');
  const sizeClass = isStart ? 'h-2 w-2' : 'h-2.5 w-2.5';

  return (
    <div
      data-timeline-node={node.id}
      data-state={node.state}
      data-node-kind={node.kind}
      data-node-color={colorName}
      data-testid={`timeline-node-${node.id}`}
      className={cx('absolute top-1/2 -translate-x-1/2 -translate-y-1/2', isPast && 'opacity-35')}
      style={{ left: `${node.atMs * NODE_SCALE_PX_PER_MS}px` }}
    >
      {node.state === 'current' ? (
        <span
          data-timeline-ring=""
          data-testid={`timeline-ring-${node.id}`}
          className="pointer-events-none absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border border-cyan"
        />
      ) : null}
      <span
        data-timeline-diamond=""
        data-testid={`timeline-diamond-${node.id}`}
        className={cx(
          'relative block clip-diamond',
          sizeClass,
          fillClass,
          isPast ? null : `${textClass} glow-track`,
        )}
      />
    </div>
  );
}

function nodeSignature(nodes: readonly TimelineNode[]): string {
  return nodes.map((node) => `${node.id}:${node.state}`).join('|');
}

function writeTrackTransform(element: HTMLDivElement | null, offsetPx: number): void {
  if (element !== null) {
    element.style.transform = `translate3d(${offsetPx}px, 0, 0)`;
  }
}
