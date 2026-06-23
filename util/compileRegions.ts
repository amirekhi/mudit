import { Slate } from "../types/slateTypes";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const dbToLinear = (db: number) => Math.pow(10, db / 20);

export interface CompiledRegion {
  trackId: string;   // = slate.id
  regionId: string;
  clipId: string;

  buffer: AudioBuffer;
  when: number;
  offset: number;
  duration: number;

  gain: number;
  pan: number;
  playbackRate: number;

  fadeIn?: number;
  fadeOut?: number;
  reverse: boolean;
}

export function compileSlate(
  slate: Slate,
  playWindow: { start: number; end: number }
): CompiledRegion[] {
  if (slate.muted) return [];

  const compiled: CompiledRegion[] = [];

  for (const region of slate.regions) {
    if (region.status === "locked") continue;
    if (region.end <= playWindow.start || region.start >= playWindow.end) continue;

    for (const clip of region.clips) {
      if (clip.edits?.mute) continue;

      const rate = clip.edits.playbackRate ?? 1;
      const visualDuration = (clip.sourceEnd - clip.sourceStart) / rate;

      const clipAbsStart = region.start + clip.offset;
      const clipAbsEnd = clipAbsStart + visualDuration;

      const playStart = Math.max(clipAbsStart, playWindow.start, region.start);
      const playEnd = Math.min(clipAbsEnd, playWindow.end, region.end);
      const timelineDuration = playEnd - playStart;
      if (timelineDuration <= 0) continue;

      const trimIn = playStart - clipAbsStart;
      const offset = clip.sourceStart + trimIn * rate;
      const duration = timelineDuration * rate;
      const when = playStart - playWindow.start;

      const gain = dbToLinear(slate.gain) * dbToLinear(clip.edits.gain ?? 0);
      const pan = clamp((slate.pan ?? 0) + (clip.edits.pan ?? 0), -1, 1);

      compiled.push({
        trackId: slate.id,
        regionId: region.id,
        clipId: clip.id,
        buffer: clip.buffer,
        when,
        offset,
        duration,
        gain,
        pan,
        playbackRate: rate,
        fadeIn: clip.edits.fadeIn,
        fadeOut: clip.edits.fadeOut,
        reverse: clip.edits.reverse ?? false,
      });
    }
  }

  return compiled;
}