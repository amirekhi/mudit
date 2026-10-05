import type { Slate, SlateRegion, RegionClip } from "@/types/slateTypes";
import type { MasterChannel } from "@/types/MasterChannel";
import {
  PROJECT_VERSION,
  type SerializedProject,
  type SerializedRegionMeta,
} from "./projectTypes";

/** The parts of the editor state that make up a project. */
export interface ProjectSnapshot {
  slates: Slate[];
  armedSlateIds: string[];
  master: MasterChannel;
}

export interface DecodedSource {
  buffer: AudioBuffer;
  peaks: number[];
}

function serializeMeta(meta: SlateRegion["meta"]): SerializedRegionMeta {
  const out: SerializedRegionMeta = { createdAt: meta.createdAt, updatedAt: meta.updatedAt };
  if (meta.locked !== undefined) out.locked = meta.locked;
  if (meta.label !== undefined) out.label = meta.label;
  if (meta.color !== undefined) out.color = meta.color;
  if (meta.originRegionId !== undefined) out.originRegionId = meta.originRegionId;
  return out;
}

/** Editor state -> plain JSON. AudioBuffers, peaks and preview peaks are left out on purpose. */
export function serializeProject(snapshot: ProjectSnapshot): SerializedProject {
  return {
    version: PROJECT_VERSION,
    slates: snapshot.slates.map(slate => ({
      id: slate.id,
      name: slate.name,
      kind: slate.kind,
      length: slate.length,
      gain: slate.gain,
      pan: slate.pan,
      muted: slate.muted,
      ...(slate.sourceTrackId ? { sourceTrackId: slate.sourceTrackId } : {}),
      meta: { createdAt: slate.meta.createdAt, updatedAt: slate.meta.updatedAt },
      regions: slate.regions.map(region => ({
        id: region.id,
        slateId: slate.id,
        start: region.start,
        end: region.end,
        parentRegionId: region.parentRegionId ?? null,
        status: region.status,
        meta: serializeMeta(region.meta),
        clips: region.clips.map(clip => ({
          id: clip.id,
          sourceTrackId: clip.sourceTrackId,
          sourceStart: clip.sourceStart,
          sourceEnd: clip.sourceEnd,
          offset: clip.offset,
          edits: { ...clip.edits },
        })),
      })),
    })),
    armedSlateIds: [...snapshot.armedSlateIds],
    master: {
      volume: snapshot.master.volume,
      muted: snapshot.master.muted,
      limiter: {
        enabled: snapshot.master.limiter.enabled,
        ceiling: snapshot.master.limiter.ceiling,
      },
    },
  };
}

/**
 * Saved project -> editor slates, using the decoded source audio.
 * A clip whose source track is missing (deleted, or it failed to decode) gets a 1-sample silent
 * buffer instead of being dropped. The structure and timing survive, nothing about it is lost
 * on the next save, and it works again if the track comes back.
 */
export function hydrateSlates(
  data: SerializedProject,
  sources: Map<string, DecodedSource>
): { slates: Slate[]; missingClips: number } {
  const silent = new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 });
  let missingClips = 0;

  const slates: Slate[] = data.slates.map(s => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    length: s.length,
    gain: s.gain,
    pan: s.pan,
    muted: s.muted,
    sourceTrackId: s.sourceTrackId,
    peaks: s.kind === "single" && s.sourceTrackId ? sources.get(s.sourceTrackId)?.peaks ?? null : null,
    previewPeaks: null,
    meta: { ...s.meta },
    regions: s.regions.map(r => ({
      id: r.id,
      slateId: s.id,
      start: r.start,
      end: r.end,
      parentRegionId: r.parentRegionId,
      status: r.status,
      meta: { ...r.meta },
      clips: r.clips.map((c): RegionClip => {
        const source = sources.get(c.sourceTrackId);
        if (!source) missingClips++;
        return {
          id: c.id,
          sourceTrackId: c.sourceTrackId,
          buffer: source ? source.buffer : silent,
          sourceStart: c.sourceStart,
          sourceEnd: c.sourceEnd,
          offset: c.offset,
          edits: { ...c.edits },
        };
      }),
    })),
  }));

  return { slates, missingClips };
}

/**
 * True when two snapshots describe the same project. Cheap on purpose: slates are compared by
 * reference where possible, and a slate whose only change is its waveform preview peaks (a
 * derived value) counts as unchanged. That is what keeps autosave from firing after every
 * preview render.
 */
export function sameProjectState(a: ProjectSnapshot, b: ProjectSnapshot): boolean {
  if (a.slates.length !== b.slates.length) return false;
  if (
    a.armedSlateIds.length !== b.armedSlateIds.length ||
    a.armedSlateIds.some((id, i) => id !== b.armedSlateIds[i])
  ) {
    return false;
  }

  const ma = a.master;
  const mb = b.master;
  if (
    ma.volume !== mb.volume ||
    ma.muted !== mb.muted ||
    ma.limiter.enabled !== mb.limiter.enabled ||
    ma.limiter.ceiling !== mb.limiter.ceiling
  ) {
    return false;
  }

  for (let i = 0; i < a.slates.length; i++) {
    const x = a.slates[i];
    const y = b.slates[i];
    if (x === y) continue;
    if (
      x.id !== y.id ||
      x.name !== y.name ||
      x.kind !== y.kind ||
      x.length !== y.length ||
      x.gain !== y.gain ||
      x.pan !== y.pan ||
      x.muted !== y.muted ||
      x.regions !== y.regions
    ) {
      return false;
    }
  }
  return true;
}
