import { describe, expect, it } from 'vitest';

import {
  EDGE_BAND_MAX,
  EDGE_BAND_MIN,
  EXIT_MARGIN_PX,
  SAME_KIND_SPACING_MS,
  SAME_KIND_SPACING_PX,
  SPAWN_MARGIN_PX,
  applySpacingShift,
  getEdgeLength,
  getSpawnBand,
  getSpawnMark,
  getSpawnPoint,
  isViewportSpawnable,
  redTargetAtMs,
  sideFromIndex,
  triangleTargetAtMs,
  type SpawnMark,
} from './enemy-spawn';

const VIEWPORT = { left: 0, top: 0, width: 800, height: 600 };

describe('spawn geometry', () => {
  it('maps side indices in the fixed replay order', () => {
    expect([0, 1, 2, 3].map(sideFromIndex)).toEqual(['top', 'right', 'bottom', 'left']);
  });

  it('rejects side indices outside the four edges', () => {
    expect(() => sideFromIndex(-1)).toThrow(RangeError);
    expect(() => sideFromIndex(4)).toThrow(RangeError);
    expect(() => sideFromIndex(1.5)).toThrow(RangeError);
  });

  it('uses width for horizontal edges and height for vertical edges', () => {
    expect(getEdgeLength(VIEWPORT, 'top')).toBe(800);
    expect(getEdgeLength(VIEWPORT, 'bottom')).toBe(800);
    expect(getEdgeLength(VIEWPORT, 'right')).toBe(600);
    expect(getEdgeLength(VIEWPORT, 'left')).toBe(600);
  });

  it('builds the 10-90% band in absolute layer coordinates', () => {
    expect(getSpawnBand(VIEWPORT, 'top')).toEqual({ minPx: 80, maxPx: 720 });
    expect(getSpawnBand(VIEWPORT, 'right')).toEqual({ minPx: 60, maxPx: 540 });

    const shifted = { left: 100, top: 50, width: 800, height: 600 };
    expect(getSpawnBand(shifted, 'top')).toEqual({ minPx: 180, maxPx: 820 });
    expect(getSpawnBand(shifted, 'left')).toEqual({ minPx: 110, maxPx: 590 });
  });

  it('exposes the fixed band and margin constants', () => {
    expect(EDGE_BAND_MIN).toBe(0.1);
    expect(EDGE_BAND_MAX).toBe(0.9);
    expect(SPAWN_MARGIN_PX).toBe(64);
    expect(EXIT_MARGIN_PX).toBe(64);
    expect(SAME_KIND_SPACING_PX).toBe(128);
    expect(SAME_KIND_SPACING_MS).toBe(1_500);
  });

  it('places the whole spawn shape exactly 64 px outside its edge', () => {
    expect(getSpawnPoint(VIEWPORT, 'top', 400, 32)).toEqual({ x: 400, y: -80 });
    expect(getSpawnPoint(VIEWPORT, 'right', 300, 32)).toEqual({ x: 880, y: 300 });
    expect(getSpawnPoint(VIEWPORT, 'bottom', 400, 32)).toEqual({ x: 400, y: 680 });
    expect(getSpawnPoint(VIEWPORT, 'left', 300, 32)).toEqual({ x: -80, y: 300 });
    expect(getSpawnPoint(VIEWPORT, 'top', 400, 40)).toEqual({ x: 400, y: -84 });
  });

  it('stores the pre-margin edge coordinate in the spawn mark', () => {
    expect(getSpawnMark('left', 250, 2_000)).toEqual({
      side: 'left',
      alongPx: 250,
      atMs: 2_000,
    });
  });
});

describe('isViewportSpawnable', () => {
  it('accepts a finite viewport larger than two margins in both axes', () => {
    expect(isViewportSpawnable(VIEWPORT)).toBe(true);
    expect(isViewportSpawnable({ left: 0, top: 0, width: 129, height: 129 })).toBe(true);
  });

  it('rejects a viewport at or below two margins on either axis', () => {
    expect(isViewportSpawnable({ left: 0, top: 0, width: 128, height: 600 })).toBe(false);
    expect(isViewportSpawnable({ left: 0, top: 0, width: 800, height: 128 })).toBe(false);
    expect(isViewportSpawnable({ left: 0, top: 0, width: 200, height: 100 })).toBe(false);
  });

  it('rejects non-finite or non-positive rectangles', () => {
    expect(isViewportSpawnable({ left: 0, top: 0, width: 0, height: 600 })).toBe(false);
    expect(isViewportSpawnable({ left: 0, top: 0, width: -800, height: 600 })).toBe(false);
    expect(isViewportSpawnable({ left: 0, top: 0, width: Number.NaN, height: 600 })).toBe(false);
    expect(
      isViewportSpawnable({ left: 0, top: 0, width: 800, height: Number.POSITIVE_INFINITY }),
    ).toBe(false);
    expect(isViewportSpawnable({ left: Number.NaN, top: 0, width: 800, height: 600 })).toBe(false);
  });
});

describe('difficulty targets', () => {
  it('keeps one red target before 45 seconds and grows every 40 seconds to 24', () => {
    expect(redTargetAtMs(0)).toBe(1);
    expect(redTargetAtMs(44_999)).toBe(1);
    expect(redTargetAtMs(45_000)).toBe(1);
    expect(redTargetAtMs(84_999)).toBe(1);
    expect(redTargetAtMs(85_000)).toBe(2);
    expect(redTargetAtMs(485_000)).toBe(12);
    expect(redTargetAtMs(600_000)).toBe(14);
    expect(redTargetAtMs(10_000_000)).toBe(24);
  });

  it('matches the red target schedule and caps triangles at twelve', () => {
    expect(triangleTargetAtMs(0)).toBe(1);
    expect(triangleTargetAtMs(44_999)).toBe(1);
    expect(triangleTargetAtMs(45_000)).toBe(1);
    expect(triangleTargetAtMs(84_999)).toBe(1);
    expect(triangleTargetAtMs(85_000)).toBe(2);
    expect(triangleTargetAtMs(205_000)).toBe(5);
    expect(triangleTargetAtMs(600_000)).toBe(12);
    expect(triangleTargetAtMs(10_000_000)).toBe(12);
  });
});

describe('applySpacingShift', () => {
  it('shifts toward the nearer 128 px endpoint above the candidate', () => {
    const last: SpawnMark = { side: 'top', alongPx: 400, atMs: 1_000 };

    expect(applySpacingShift(VIEWPORT, 'top', 450, last, 2_000)).toBe(528);
  });

  it('shifts toward the nearer 128 px endpoint below the candidate', () => {
    const last: SpawnMark = { side: 'top', alongPx: 400, atMs: 1_000 };

    expect(applySpacingShift(VIEWPORT, 'top', 350, last, 2_000)).toBe(272);
  });

  it('treats an exact spacing distance as already separated', () => {
    const last: SpawnMark = { side: 'top', alongPx: 400, atMs: 1_000 };

    expect(applySpacingShift(VIEWPORT, 'top', 528, last, 2_000)).toBe(528);
    expect(applySpacingShift(VIEWPORT, 'top', 272, last, 2_000)).toBe(272);
  });

  it('uses the single endpoint that is inside the 10-90% band', () => {
    const last: SpawnMark = { side: 'top', alongPx: 50, atMs: 1_000 };

    expect(
      applySpacingShift({ left: 0, top: 0, width: 200, height: 600 }, 'top', 60, last, 1_500),
    ).toBe(178);
  });

  it('keeps the candidate when neither endpoint is inside the band', () => {
    const last: SpawnMark = { side: 'top', alongPx: 150, atMs: 1_000 };

    expect(
      applySpacingShift({ left: 0, top: 0, width: 300, height: 300 }, 'top', 160, last, 1_500),
    ).toBe(160);
  });

  it('does not constrain a different spawn side', () => {
    const last: SpawnMark = { side: 'right', alongPx: 400, atMs: 1_000 };

    expect(applySpacingShift(VIEWPORT, 'top', 450, last, 1_100)).toBe(450);
  });

  it('does not constrain an old spawn mark', () => {
    const last: SpawnMark = { side: 'top', alongPx: 400, atMs: 1_000 };

    expect(applySpacingShift(VIEWPORT, 'top', 450, last, 2_501)).toBe(450);
    expect(applySpacingShift(VIEWPORT, 'top', 450, last, 2_500)).toBe(528);
  });

  it('does not constrain when there is no previous same-kind spawn', () => {
    expect(applySpacingShift(VIEWPORT, 'top', 450, null, 2_000)).toBe(450);
  });
});
