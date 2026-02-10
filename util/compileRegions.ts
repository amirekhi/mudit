import { EditorProject, EditorRegion, EditorTrack } from "../types/editorTypes";

/** utils */

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const dbToLinear = (db: number) =>
  Math.pow(10, db / 20);

/** compiled output */

export interface CompiledRegion {
  trackId: string;
  regionId: string;

  buffer: AudioBuffer;

  when: number;     // seconds from playWindow.start
  offset: number;   // seconds into buffer
  duration: number;

  gain: number;     // linear
  pan: number;      // -1..1
  playbackRate: number;

  fadeIn?: number;
  fadeOut?: number;

  reverse: boolean;
}

/** compiler */

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

      if (
        region.end <= playWindow.start ||
        region.start >= playWindow.end
      ) {
        continue;
      }

      const playStart = Math.max(region.start, playWindow.start);
      const playEnd = Math.min(region.end, playWindow.end);
      const duration = playEnd - playStart;

      if (duration <= 0) continue;

      const offset = playStart - region.start;
      const when = playStart - playWindow.start;

      const regionEdits = region.edits ?? {};

      const gain =
        dbToLinear(track.gain ?? 0) *
        dbToLinear(regionEdits.gain ?? 0);

      const pan = clamp(
        (track.pan ?? 0) + (regionEdits.pan ?? 0),
        -1,
        1
      );

      const playbackRate = regionEdits.playbackRate ?? 1;

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
