import type { Slate } from "@/types/slateTypes";

/* ───────────── zoom ───────────── */

export const MIN_PPS = 4;          // pixels per second, zoomed all the way out
export const MAX_PPS = 800;        // zoomed all the way in
export const MAX_TOTAL_PX = 48_000; // cap on the timeline's pixel width, so waveform canvases stay a sane size
export const FIT_MARGIN = 56;      // "fit" leaves room for card padding

export interface ZoomState {
  fit: boolean;
  pxPerSecond: number;
  viewportWidth: number;
}

/** The pixels-per-second actually used, after "fit" and the limits are applied. */
export function resolvePps(zoom: ZoomState, referenceLength: number): number {
  const ref = Math.max(referenceLength, 1);
  const raw = zoom.fit ? (zoom.viewportWidth - FIT_MARGIN) / ref : zoom.pxPerSecond;
  const max = Math.min(MAX_PPS, MAX_TOTAL_PX / ref);
  return Math.min(max, Math.max(MIN_PPS, raw));
}

/* ───────────── snapping ───────────── */

export interface SnapConfig {
  enabled: boolean;
  bpm: number;
  /** Grid lines per beat: 1 = every beat, 2 = every half beat, 4 = every quarter beat. */
  division: number;
  pxPerSecond: number;
  /** Magnetic points (region edges, playhead...) in seconds. */
  points: number[];
  /** How close (in pixels) a magnetic point has to be to grab the time. */
  thresholdPx?: number;
}

export const gridStepSeconds = (bpm: number, division: number) =>
  60 / Math.max(20, bpm) / Math.max(1, division);

/**
 * The grid spacing that is actually used. When zoomed out, the beat grid would be a few pixels
 * apart: invisible, and pointless to snap to. So the spacing doubles until the lines are at least
 * `minPx` apart. The same spacing is used for drawing the lines and for snapping.
 */
export function effectiveGridStep(bpm: number, division: number, pxPerSecond: number, minPx = 12): number {
  let step = gridStepSeconds(bpm, division);
  while (step * pxPerSecond < minPx && step < 3600) step *= 2;
  return step;
}

export interface SnapResult {
  time: number;
  snapped: boolean;
  kind: "point" | "grid" | null;
}

/**
 * Snaps a time. Magnetic points (the edges of other regions, the playhead, zero) win whenever one
 * is within the pixel threshold, like in a DAW. Otherwise the time goes to the nearest grid line.
 */
export function snapTimeDetailed(t: number, cfg: SnapConfig): SnapResult {
  if (!cfg.enabled) return { time: Math.max(0, t), snapped: false, kind: null };

  const threshold = (cfg.thresholdPx ?? 10) / cfg.pxPerSecond;
  let nearest: number | null = null;
  let nearestDist = Infinity;
  for (const p of cfg.points) {
    const d = Math.abs(p - t);
    if (d <= threshold && d < nearestDist) {
      nearest = p;
      nearestDist = d;
    }
  }
  if (nearest !== null) return { time: Math.max(0, nearest), snapped: true, kind: "point" };

  const step = effectiveGridStep(cfg.bpm, cfg.division, cfg.pxPerSecond);
  return { time: Math.max(0, Math.round(t / step) * step), snapped: true, kind: "grid" };
}

export const snapTime = (t: number, cfg: SnapConfig): number => snapTimeDetailed(t, cfg).time;

export interface RegionSnapResult {
  start: number;
  /** Where to draw the snap guide line (the edge that snapped), or null if nothing snapped. */
  guide: number | null;
  kind: "point" | "grid" | null;
}

/**
 * Snaps a region being moved. Either its start or its end can land on a snap target: a magnetic
 * point beats the grid, otherwise whichever edge has to move the least wins.
 */
export function snapRegionMoveDetailed(start: number, duration: number, cfg: SnapConfig): RegionSnapResult {
  if (!cfg.enabled) return { start: Math.max(0, start), guide: null, kind: null };

  const byStart = snapTimeDetailed(start, cfg);
  const byEnd = snapTimeDetailed(start + duration, cfg);
  const startDelta = Math.abs(byStart.time - start);
  const endDelta = Math.abs(byEnd.time - (start + duration));

  let useEnd: boolean;
  if (byStart.kind === "point" && byEnd.kind !== "point") useEnd = false;
  else if (byEnd.kind === "point" && byStart.kind !== "point") useEnd = true;
  else useEnd = endDelta < startDelta;

  if (useEnd) {
    return { start: Math.max(0, byEnd.time - duration), guide: byEnd.time, kind: byEnd.kind };
  }
  return { start: byStart.time, guide: byStart.time, kind: byStart.kind };
}

export const snapRegionMove = (start: number, duration: number, cfg: SnapConfig): number =>
  snapRegionMoveDetailed(start, duration, cfg).start;

/** Region edges in every slate (except the one being dragged), the playhead and zero. */
export function collectSnapPoints(slates: Slate[], excludeRegionId: string | null, playhead: number): number[] {
  const points: number[] = [0, playhead];
  for (const slate of slates) {
    for (const region of slate.regions) {
      if (region.id === excludeRegionId) continue;
      points.push(region.start, region.end);
    }
  }
  return points;
}

/* ───────────── ruler ───────────── */

// [major tick spacing, minor tick spacing] in seconds
const RULER_STEPS: Array<[number, number]> = [
  [0.01, 0.002], [0.02, 0.005], [0.05, 0.01], [0.1, 0.02], [0.2, 0.05], [0.5, 0.1],
  [1, 0.2], [2, 0.5], [5, 1], [10, 2], [15, 5], [30, 5], [60, 10], [120, 30],
  [300, 60], [600, 120], [1800, 300], [3600, 600],
];

/** Picks tick spacing so labelled ticks are at least ~90px apart. */
export function rulerSteps(pxPerSecond: number): { major: number; minor: number } {
  const found = RULER_STEPS.find(([major]) => major * pxPerSecond >= 90) ?? RULER_STEPS[RULER_STEPS.length - 1];
  return { major: found[0], minor: found[1] };
}

/** m:ss, with decimals when the ticks are closer than a second. */
export function formatTime(seconds: number, step: number): string {
  const s = Math.max(0, Math.round(seconds / step) * step);
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const secText = rem.toFixed(decimals).padStart(decimals ? 3 + decimals : 2, "0");
  return `${m}:${secText}`;
}
