import {
  EditorProject,
  EditorTrack,
  EditorRegion,
} from "../types/editorTypes";

/* ================================
   Utils
================================ */

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const dbToLinear = (db: number) =>
  Math.pow(10, db / 20);

/* ================================
   Compiled Output
================================ */

export interface CompiledRegion {
  trackId: string;
  regionId: string;

  buffer: AudioBuffer;

  when: number;     // timeline seconds from playWindow.start
  offset: number;   // source seconds inside AudioBuffer
  duration: number; // source seconds

  gain: number;     // linear
  pan: number;      // -1..1
  playbackRate: number;

  fadeIn?: number;
  fadeOut?: number;

  reverse: boolean;
}

/* ================================
   Compiler
================================ */

export function compileRegions(
  project: EditorProject,
  playWindow: { start: number; end: number }
): CompiledRegion[] {
  const compiled: CompiledRegion[] = [];

  for (const track of project.tracks) {
    if (!track.audioBuffer) continue;
    if (track.muted) continue;

    for (const region of track.regions) {
      if (region.status === "locked") continue;
      if (region.edits?.mute) continue;

      // Skip regions outside play window
      if (
        region.end <= playWindow.start ||
        region.start >= playWindow.end
      ) {
        continue;
      }

      const regionEdits = region.edits ?? {};
      const playbackRate = regionEdits.playbackRate ?? 1;

      // --- Timeline clipping ---
      const playStart = Math.max(region.start, playWindow.start);
      const playEnd = Math.min(region.end, playWindow.end);

      const timelineDuration = playEnd - playStart;
      if (timelineDuration <= 0) continue;

      const timelineOffset = playStart - region.start;

      // --- 🔥 KEY FIX ---
      // Convert timeline space → source space
      const offset =
        region.sourceStart +
        timelineOffset * playbackRate;

      const duration =
        timelineDuration * playbackRate;

      const when =
        playStart - playWindow.start;

      const gain =
        dbToLinear(track.gain ?? 0) *
        dbToLinear(regionEdits.gain ?? 0);

      const pan = clamp(
        (track.pan ?? 0) + (regionEdits.pan ?? 0),
        -1,
        1
      );

      compiled.push({
        trackId: track.id,
        regionId: region.id,

        buffer: track.audioBuffer,

        when,
        offset,
        duration,

        gain,
        pan,
        playbackRate,

        fadeIn: regionEdits.fadeIn,
        fadeOut: regionEdits.fadeOut,
        reverse: regionEdits.reverse ?? false,
      });
    }
  }

  return compiled;
}
