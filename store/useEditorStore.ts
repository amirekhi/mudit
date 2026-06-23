"use client";

import { create } from "zustand";
import { Slate, SlateRegion, RegionClip, ClipEdits } from "@/types/slateTypes";
import { RegionClipboard } from "@/types/clipboard";
import { MasterChannel } from "@/types/MasterChannel";
import { TransportState } from "@/types/transport";
import type { Track } from "@/store/useAudioStore";
import { useEngineStore } from "./useEngineStore";

function cloneClip(clip: RegionClip): RegionClip {
  return { ...clip, edits: { ...clip.edits } };
}
function cloneRegion(region: SlateRegion): SlateRegion {
  return { ...region, clips: region.clips.map(cloneClip), meta: { ...region.meta } };
}
function cloneSlate(slate: Slate): Slate {
  return { ...slate, regions: slate.regions.map(cloneRegion), meta: { ...slate.meta } };
}
function cloneSlates(slates: Slate[]): Slate[] {
  return slates.map(cloneSlate);
}

interface EditorState {
  library: Track[];
  setLibrary(tracks: Track[]): void;

  slates: Slate[];
  past: Slate[][];
  future: Slate[][];

  selectedSlateId: string | null;
  armedSlateIds: string[];
  selectedRegionId: string | null;
  selectedClipId: string | null;

  clipboard: RegionClipboard | null;
  transport: TransportState;
  master: MasterChannel;

  loadTrackAsSlate(track: Track, buffer: AudioBuffer, peaks: number[]): string;
  addSlate(name?: string, kind?: "single" | "project"): string;
  removeSlate(slateId: string): void;
  renameSlate(slateId: string, name: string): void;
  selectSlate(id: string | null): void;
  toggleArmSlate(id: string): void;
  selectRegion(regionId: string | null): void;
  selectClip(clipId: string | null): void;
  setSlatePreviewPeaks(slateId: string, peaks: Float32Array): void;
  setSlateLength(slateId: string, length: number): void;
  setSlateGain(slateId: string, value: number): void;
  setSlatePan(slateId: string, value: number): void;
  toggleSlateMute(slateId: string): void;

  createRegionFromSelection(
    sourceSlateId: string,
    selStart: number,
    selEnd: number,
    targetSlateId: string,
    placeAt: number
  ): string | undefined;
  splitRegion(slateId: string, regionId: string, at: number): void;
  duplicateRegion(slateId: string, regionId: string): void;
  removeRegion(slateId: string, regionId: string): void;
  lockRegion(slateId: string, regionId: string, locked: boolean): void;
  moveRegion(slateId: string, regionId: string, newStart: number): void;
  copyRegionToSlate(sourceSlateId: string, regionId: string, targetSlateId: string, at: number): void;

  applyToRegionClips(slateId: string, regionId: string, fn: (clip: RegionClip) => RegionClip): void;
  applyRegionGain(slateId: string, regionId: string, deltaDb: number): void;
  applyRegionPan(slateId: string, regionId: string, delta: number): void;
  applyRegionPlaybackRate(slateId: string, regionId: string, factor: number): void;
  applyRegionPitch(slateId: string, regionId: string, deltaSemi: number): void;
  applyRegionFadeIn(slateId: string, regionId: string, delta: number): void;
  applyRegionFadeOut(slateId: string, regionId: string, delta: number): void;
  toggleRegionReverse(slateId: string, regionId: string): void;
  toggleRegionMute(slateId: string, regionId: string): void;

  removeClipFromRegion(slateId: string, regionId: string, clipId: string): void;
  updateClipEdits(slateId: string, regionId: string, clipId: string, patch: Partial<ClipEdits>): void;
  updateClipPlaybackRate(slateId: string, regionId: string, clipId: string, value: number): void;

  copyRegion(slateId: string, regionId: string): void;
  cutRegion(slateId: string, regionId: string): void;
  pasteRegion(targetSlateId: string, at: number): void;
  clearClipboard(): void;

  setMasterVolume(value: number): void;
  toggleMasterMute(): void;
  setLimiterEnabled(enabled: boolean): void;
  setLimiterCeiling(value: number): void;

  play(): void;
  pause(): void;
  seek(time: number): void;
  setProjectDuration(duration: number): void;
  _tick(dt: number): void;

  undo(): void;
  redo(): void;
  _pushPast(): void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  library: [],
  setLibrary: (tracks) => set({ library: tracks }),

  slates: [],
  past: [],
  future: [],

  selectedSlateId: null,
  armedSlateIds: [],
  selectedRegionId: null,
  selectedClipId: null,

  clipboard: null,

  master: {
    volume: 1,
    muted: false,
    limiter: { enabled: false, ceiling: 0.98 },
  },

  transport: {
    time: 0,
    isPlaying: false,
    rate: 1,
    pxPerSecond: 100,
    syncedTrackIds: new Set<string>(),
    duration: 0,
  },

  /* ======================== SLATE LIFECYCLE ======================== */

  loadTrackAsSlate: (track, buffer, peaks) => {
    const slateId = crypto.randomUUID();
    const duration = buffer.duration;

    const clip: RegionClip = {
      id: crypto.randomUUID(),
      sourceTrackId: track._id,
      buffer,
      sourceStart: 0,
      sourceEnd: duration,
      offset: 0,
      edits: {},
    };

    const region: SlateRegion = {
      id: crypto.randomUUID(),
      slateId,
      start: 0,
      end: duration,
      clips: [clip],
      parentRegionId: null,
      status: "empty",
      meta: { createdAt: Date.now(), updatedAt: Date.now() },
    };

    const slate: Slate = {
      id: slateId,
      name: track.title,
      kind: "single",
      regions: [region],
      length: duration,
      gain: 0,
      pan: 0,
      muted: false,
      sourceTrackId: track._id,
      peaks,
      previewPeaks: null,
      meta: { createdAt: Date.now(), updatedAt: Date.now() },
    };

    set(state => ({ slates: [...state.slates, slate] }));
    return slateId;
  },

  addSlate: (name, kind = "project") => {
    const id = crypto.randomUUID();
    const defaultLength = get().slates.length ? Math.max(...get().slates.map(s => s.length)) : 60;

    set(state => ({
      slates: [
        ...state.slates,
        {
          id,
          name: name ?? `Slate ${state.slates.filter(s => s.kind === "project").length + 1}`,
          kind,
          regions: [],
          length: defaultLength,
          gain: 0,
          pan: 0,
          muted: false,
          peaks: null,
          previewPeaks: null,
          meta: { createdAt: Date.now(), updatedAt: Date.now() },
        },
      ],
    }));
    return id;
  },

  removeSlate: (slateId) =>
    set(state => ({
      slates: state.slates.filter(s => s.id !== slateId),
      armedSlateIds: state.armedSlateIds.filter(id => id !== slateId),
      selectedSlateId: state.selectedSlateId === slateId ? null : state.selectedSlateId,
    })),

  renameSlate: (slateId, name) =>
    set(state => ({
      slates: state.slates.map(s =>
        s.id === slateId ? { ...s, name, meta: { ...s.meta, updatedAt: Date.now() } } : s
      ),
    })),

  selectSlate: (id) => set({ selectedSlateId: id }),

  toggleArmSlate: (id) =>
    set(state => ({
      armedSlateIds: state.armedSlateIds.includes(id)
        ? state.armedSlateIds.filter(i => i !== id)
        : [...state.armedSlateIds, id],
    })),

  selectRegion: (regionId) => set({ selectedRegionId: regionId, selectedClipId: null }),
  selectClip: (clipId) => set({ selectedClipId: clipId }),

  setSlatePreviewPeaks: (slateId, peaks) =>
    set(state => ({
      slates: state.slates.map(s => (s.id === slateId ? { ...s, previewPeaks: peaks } : s)),
    })),

  setSlateLength: (slateId, length) =>
    set(state => ({
      slates: state.slates.map(s =>
        s.id === slateId
          ? { ...s, length: Math.max(0, length), meta: { ...s.meta, updatedAt: Date.now() } }
          : s
      ),
    })),

  setSlateGain: (slateId, value) =>
    set(state => ({ slates: state.slates.map(s => (s.id === slateId ? { ...s, gain: value } : s)) })),

  setSlatePan: (slateId, value) =>
    set(state => ({ slates: state.slates.map(s => (s.id === slateId ? { ...s, pan: value } : s)) })),

  toggleSlateMute: (slateId) =>
    set(state => ({ slates: state.slates.map(s => (s.id === slateId ? { ...s, muted: !s.muted } : s)) })),

  /* ======================== HISTORY ======================== */

  _pushPast: () => {
    const { slates, past } = get();
    set({ past: [...past, cloneSlates(slates)], future: [] });
  },

  undo: () => {
    const { past, slates, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({ slates: previous, past: past.slice(0, -1), future: [cloneSlates(slates), ...future] });
  },

  redo: () => {
    const { past, slates, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({ slates: next, past: [...past, cloneSlates(slates)], future: future.slice(1) });
  },

  /* ======================== STRUCTURAL REGION OPS ======================== */

  createRegionFromSelection: (sourceSlateId, selStart, selEnd, targetSlateId, placeAt) => {
    const sourceSlate = get().slates.find(s => s.id === sourceSlateId);
    if (!sourceSlate || selEnd <= selStart) return;

    const newClips: RegionClip[] = [];

    for (const region of sourceSlate.regions) {
      if (region.end <= selStart || region.start >= selEnd) continue;

      for (const clip of region.clips) {
        const rate = clip.edits.playbackRate ?? 1;
        const visualDuration = (clip.sourceEnd - clip.sourceStart) / rate;
        const clipAbsStart = region.start + clip.offset;
        const clipAbsEnd = clipAbsStart + visualDuration;

        const playStart = Math.max(clipAbsStart, selStart, region.start);
        const playEnd = Math.min(clipAbsEnd, selEnd, region.end);
        if (playEnd <= playStart) continue;

        const trimIn = playStart - clipAbsStart;
        const newSourceStart = clip.sourceStart + trimIn * rate;
        const newSourceEnd = newSourceStart + (playEnd - playStart) * rate;

        newClips.push({
          id: crypto.randomUUID(),
          sourceTrackId: clip.sourceTrackId,
          buffer: clip.buffer,
          sourceStart: newSourceStart,
          sourceEnd: newSourceEnd,
          offset: playStart - selStart,
          edits: { ...clip.edits },
        });
      }
    }

    get()._pushPast();

    const newRegion: SlateRegion = {
      id: crypto.randomUUID(),
      slateId: targetSlateId,
      start: placeAt,
      end: placeAt + (selEnd - selStart),
      clips: newClips,
      parentRegionId: null,
      status: newClips.some(c => Object.keys(c.edits).length > 0) ? "edited" : "empty",
      meta: { createdAt: Date.now(), updatedAt: Date.now() },
    };

    set(state => ({
      slates: state.slates.map(s =>
        s.id === targetSlateId
          ? {
              ...s,
              regions: [...s.regions, newRegion],
              length: Math.max(s.length, newRegion.end),
              meta: { ...s.meta, updatedAt: Date.now() },
            }
          : s
      ),
    }));

    return newRegion.id;
  },

  splitRegion: (slateId, regionId, at) => {
    const slate = get().slates.find(s => s.id === slateId);
    const parent = slate?.regions.find(r => r.id === regionId);
    if (!slate || !parent) return;
    if (at <= parent.start || at >= parent.end) return;

    get()._pushPast();

    const leftClips: RegionClip[] = [];
    const rightClips: RegionClip[] = [];

    for (const clip of parent.clips) {
      const rate = clip.edits.playbackRate ?? 1;
      const visualDuration = (clip.sourceEnd - clip.sourceStart) / rate;
      const clipAbsStart = parent.start + clip.offset;
      const clipAbsEnd = clipAbsStart + visualDuration;

      const leftStart = Math.max(clipAbsStart, parent.start);
      const leftEnd = Math.min(clipAbsEnd, at);
      if (leftEnd > leftStart) {
        const trimIn = leftStart - clipAbsStart;
        const sStart = clip.sourceStart + trimIn * rate;
        const sEnd = sStart + (leftEnd - leftStart) * rate;
        leftClips.push({
          id: crypto.randomUUID(),
          sourceTrackId: clip.sourceTrackId,
          buffer: clip.buffer,
          sourceStart: sStart,
          sourceEnd: sEnd,
          offset: leftStart - parent.start,
          edits: { ...clip.edits },
        });
      }

      const rightStart = Math.max(clipAbsStart, at);
      const rightEnd = Math.min(clipAbsEnd, parent.end);
      if (rightEnd > rightStart) {
        const trimIn = rightStart - clipAbsStart;
        const sStart = clip.sourceStart + trimIn * rate;
        const sEnd = sStart + (rightEnd - rightStart) * rate;
        rightClips.push({
          id: crypto.randomUUID(),
          sourceTrackId: clip.sourceTrackId,
          buffer: clip.buffer,
          sourceStart: sStart,
          sourceEnd: sEnd,
          offset: rightStart - at,
          edits: { ...clip.edits },
        });
      }
    }

    const left: SlateRegion = {
      id: crypto.randomUUID(),
      slateId,
      start: parent.start,
      end: at,
      clips: leftClips,
      parentRegionId: regionId,
      status: parent.status,
      meta: { createdAt: Date.now(), updatedAt: Date.now(), originRegionId: regionId },
    };

    const right: SlateRegion = {
      id: crypto.randomUUID(),
      slateId,
      start: at,
      end: parent.end,
      clips: rightClips,
      parentRegionId: regionId,
      status: parent.status,
      meta: { createdAt: Date.now(), updatedAt: Date.now(), originRegionId: regionId },
    };

    set(state => ({
      slates: state.slates.map(s =>
        s.id !== slateId ? s : { ...s, regions: [...s.regions.filter(r => r.id !== regionId), left, right] }
      ),
    }));
  },

  duplicateRegion: (slateId, regionId) => {
    get()._pushPast();
    set(state => ({
      slates: state.slates.map(slate => {
        if (slate.id !== slateId) return slate;
        const r = slate.regions.find(r => r.id === regionId);
        if (!r) return slate;

        const copy: SlateRegion = {
          ...r,
          id: crypto.randomUUID(),
          clips: r.clips.map(c => ({ ...c, id: crypto.randomUUID(), edits: { ...c.edits } })),
          parentRegionId: regionId,
          meta: { createdAt: Date.now(), updatedAt: Date.now(), originRegionId: regionId },
        };

        return { ...slate, regions: [...slate.regions, copy] };
      }),
    }));
  },

  removeRegion: (slateId, regionId) => {
    get()._pushPast();
    set(state => ({
      slates: state.slates.map(slate =>
        slate.id === slateId ? { ...slate, regions: slate.regions.filter(r => r.id !== regionId) } : slate
      ),
    }));
  },

  lockRegion: (slateId, regionId, locked) => {
    get()._pushPast();
    set(state => ({
      slates: state.slates.map(slate =>
        slate.id !== slateId
          ? slate
          : {
              ...slate,
              regions: slate.regions.map(r =>
                r.id === regionId ? { ...r, meta: { ...r.meta, locked, updatedAt: Date.now() } } : r
              ),
            }
      ),
    }));
  },

  moveRegion: (slateId, regionId, newStart) => {
    const slate = get().slates.find(s => s.id === slateId);
    const region = slate?.regions.find(r => r.id === regionId);
    if (!slate || !region || region.meta.locked) return;

    const duration = region.end - region.start;
    const clampedStart = Math.max(0, newStart);
    const newEnd = clampedStart + duration;

    get()._pushPast();

    set(state => ({
      slates: state.slates.map(s =>
        s.id !== slateId
          ? s
          : {
              ...s,
              regions: s.regions.map(r =>
                r.id === regionId
                  ? { ...r, start: clampedStart, end: newEnd, meta: { ...r.meta, updatedAt: Date.now() } }
                  : r
              ),
              length: Math.max(s.length, newEnd),
            }
      ),
    }));
  },

  copyRegionToSlate: (sourceSlateId, regionId, targetSlateId, at) => {
    const source = get().slates.find(s => s.id === sourceSlateId);
    const region = source?.regions.find(r => r.id === regionId);
    if (!region) return;

    get()._pushPast();

    const duration = region.end - region.start;
    const copy: SlateRegion = {
      ...region,
      id: crypto.randomUUID(),
      slateId: targetSlateId,
      start: at,
      end: at + duration,
      clips: region.clips.map(c => ({ ...c, id: crypto.randomUUID(), edits: { ...c.edits } })),
      meta: { createdAt: Date.now(), updatedAt: Date.now(), originRegionId: regionId },
    };

    set(state => ({
      slates: state.slates.map(s =>
        s.id === targetSlateId
          ? { ...s, regions: [...s.regions, copy], length: Math.max(s.length, copy.end) }
          : s
      ),
    }));
  },

  /* ======================== REGION-WIDE (CASCADES TO ALL CLIPS) ======================== */

  applyToRegionClips: (slateId, regionId, fn) => {
    get()._pushPast();
    set(state => ({
      slates: state.slates.map(s =>
        s.id !== slateId
          ? s
          : {
              ...s,
              regions: s.regions.map(r =>
                r.id !== regionId || r.meta.locked
                  ? r
                  : { ...r, clips: r.clips.map(fn), status: "edited", meta: { ...r.meta, updatedAt: Date.now() } }
              ),
            }
      ),
    }));
    useEngineStore.getState().playSlate?.(slateId);
  },

  applyRegionGain: (slateId, regionId, deltaDb) =>
    get().applyToRegionClips(slateId, regionId, c => ({ ...c, edits: { ...c.edits, gain: (c.edits.gain ?? 0) + deltaDb } })),

  applyRegionPan: (slateId, regionId, delta) =>
    get().applyToRegionClips(slateId, regionId, c => ({
      ...c,
      edits: { ...c.edits, pan: Math.max(-1, Math.min(1, (c.edits.pan ?? 0) + delta)) },
    })),

applyRegionPlaybackRate: (slateId, regionId, factor) => {
  const slate = get().slates.find(s => s.id === slateId);
  const region = slate?.regions.find(r => r.id === regionId);
  if (!slate || !region || region.meta.locked || factor <= 0) return;

  get()._pushPast();

  // every clip's rate AND internal offset scale together, so layered
  // clips inside THIS region stay proportionally aligned to each other —
  // nothing about any other region is touched
  const updatedClips = region.clips.map(c => ({
    ...c,
    offset: c.offset / factor,
    edits: { ...c.edits, playbackRate: (c.edits.playbackRate ?? 1) * factor },
  }));

  const newDuration = updatedClips.length
    ? Math.max(
        ...updatedClips.map(c => {
          const rate = c.edits.playbackRate ?? 1;
          const visualDur = (c.sourceEnd - c.sourceStart) / rate;
          return c.offset + visualDur;
        })
      )
    : 0;

  const newEnd = region.start + newDuration;

  set(state => ({
    slates: state.slates.map(s =>
      s.id !== slateId
        ? s
        : {
            ...s,
            regions: s.regions.map(r =>
              r.id === regionId
                ? { ...r, end: newEnd, clips: updatedClips, status: "edited" as const, meta: { ...r.meta, updatedAt: Date.now() } }
                : r
            ),
            length: Math.max(s.length, newEnd), // auto-grow only, same rule used everywhere else — never shrinks the slate
          }
    ),
  }));

  useEngineStore.getState().playSlate?.(slateId);
},

  applyRegionPitch: (slateId, regionId, deltaSemi) =>
    get().applyToRegionClips(slateId, regionId, c => ({ ...c, edits: { ...c.edits, pitch: (c.edits.pitch ?? 0) + deltaSemi } })),

  applyRegionFadeIn: (slateId, regionId, delta) =>
    get().applyToRegionClips(slateId, regionId, c => ({
      ...c,
      edits: { ...c.edits, fadeIn: Math.max(0, (c.edits.fadeIn ?? 0) + delta) },
    })),

  applyRegionFadeOut: (slateId, regionId, delta) =>
    get().applyToRegionClips(slateId, regionId, c => ({
      ...c,
      edits: { ...c.edits, fadeOut: Math.max(0, (c.edits.fadeOut ?? 0) + delta) },
    })),

  toggleRegionReverse: (slateId, regionId) =>
    get().applyToRegionClips(slateId, regionId, c => ({ ...c, edits: { ...c.edits, reverse: !c.edits.reverse } })),

  toggleRegionMute: (slateId, regionId) =>
    get().applyToRegionClips(slateId, regionId, c => ({ ...c, edits: { ...c.edits, mute: !c.edits.mute } })),

  /* ======================== SINGLE-CLIP TARGETING (deliberate, separate from above) ======================== */

  removeClipFromRegion: (slateId, regionId, clipId) => {
    get()._pushPast();
    set(state => ({
      slates: state.slates.map(s =>
        s.id !== slateId
          ? s
          : {
              ...s,
              regions: s.regions.map(r =>
                r.id !== regionId
                  ? r
                  : { ...r, clips: r.clips.filter(c => c.id !== clipId), meta: { ...r.meta, updatedAt: Date.now() } }
              ),
            }
      ),
    }));
  },

  updateClipEdits: (slateId, regionId, clipId, patch) => {
    get()._pushPast();
    set(state => ({
      slates: state.slates.map(s =>
        s.id !== slateId
          ? s
          : {
              ...s,
              regions: s.regions.map(r =>
                r.id !== regionId || r.meta.locked
                  ? r
                  : {
                      ...r,
                      clips: r.clips.map(c => (c.id === clipId ? { ...c, edits: { ...c.edits, ...patch } } : c)),
                      status: "edited",
                      meta: { ...r.meta, updatedAt: Date.now() },
                    }
              ),
            }
      ),
    }));
    useEngineStore.getState().playSlate?.(slateId);
  },

  updateClipPlaybackRate: (slateId, regionId, clipId, value) => {
    get()._pushPast();
    set(state => ({
      slates: state.slates.map(s =>
        s.id !== slateId
          ? s
          : {
              ...s,
              regions: s.regions.map(r =>
                r.id !== regionId || r.meta.locked
                  ? r
                  : {
                      ...r,
                      clips: r.clips.map(c =>
                        c.id === clipId
                          ? { ...c, edits: { ...c.edits, playbackRate: (c.edits.playbackRate ?? 1) * value } }
                          : c
                      ),
                      status: "edited",
                      meta: { ...r.meta, updatedAt: Date.now() },
                    }
              ),
            }
      ),
    }));
    useEngineStore.getState().playSlate?.(slateId);
  },

  /* ======================== CLIPBOARD ======================== */

  copyRegion: (slateId, regionId) => {
    const region = get().slates.find(s => s.id === slateId)?.regions.find(r => r.id === regionId);
    if (!region) return;
    set({ clipboard: { mode: "copy", region: cloneRegion(region) } });
  },

  cutRegion: (slateId, regionId) => {
    const region = get().slates.find(s => s.id === slateId)?.regions.find(r => r.id === regionId);
    if (!region) return;

    get()._pushPast();
    set(state => ({
      clipboard: { mode: "cut", region: cloneRegion(region) },
      slates: state.slates.map(s =>
        s.id === slateId ? { ...s, regions: s.regions.filter(r => r.id !== regionId) } : s
      ),
      selectedRegionId: null,
      selectedClipId: null,
    }));
  },

  pasteRegion: (targetSlateId, at) => {
    const { clipboard } = get();
    if (!clipboard) return;

    get()._pushPast();

    const duration = clipboard.region.end - clipboard.region.start;
    const pasted: SlateRegion = {
      ...clipboard.region,
      id: crypto.randomUUID(),
      slateId: targetSlateId,
      start: at,
      end: at + duration,
      clips: clipboard.region.clips.map(c => ({ ...c, id: crypto.randomUUID(), edits: { ...c.edits } })),
      meta: { ...clipboard.region.meta, createdAt: Date.now(), updatedAt: Date.now() },
    };

    set(state => ({
      slates: state.slates.map(s =>
        s.id === targetSlateId
          ? { ...s, regions: [...s.regions, pasted], length: Math.max(s.length, pasted.end) }
          : s
      ),
      clipboard: clipboard.mode === "cut" ? null : clipboard,
    }));
  },

  clearClipboard: () => set({ clipboard: null }),

  /* ======================== MASTER ======================== */

  setMasterVolume: (value) =>
    set(state => ({ master: { ...state.master, volume: Math.max(0, Math.min(1, value)) } })),

  toggleMasterMute: () => set(state => ({ master: { ...state.master, muted: !state.master.muted } })),

  setLimiterEnabled: (enabled) =>
    set(state => ({ master: { ...state.master, limiter: { ...state.master.limiter, enabled } } })),

  setLimiterCeiling: (value) =>
    set(state => ({
      master: { ...state.master, limiter: { ...state.master.limiter, ceiling: Math.max(0.5, Math.min(1, value)) } },
    })),

  /* ======================== TRANSPORT ======================== */

  play: () => set(state => ({ transport: { ...state.transport, isPlaying: true } })),
  pause: () => set(state => ({ transport: { ...state.transport, isPlaying: false } })),

  seek: (time) =>
    set(state => ({
      transport: { ...state.transport, time: Math.max(0, Math.min(state.transport.duration, time)) },
    })),

  setProjectDuration: (duration) => set(state => ({ transport: { ...state.transport, duration } })),

  _tick: (dt) =>
    set(state => {
      if (!state.transport.isPlaying) return state;
      const next = state.transport.time + dt * state.transport.rate;
      return {
        transport: {
          ...state.transport,
          time: Math.min(next, state.transport.duration),
          isPlaying: next < state.transport.duration,
        },
      };
    }),
}));