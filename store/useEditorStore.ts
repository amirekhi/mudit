"use client";

import { create } from "zustand";
import { EditorTrack, EditorRegion } from "@/types/editorTypes";
import { createRegion } from "@/lib/editor/createRegion";

interface EditorState {
  tracks: EditorTrack[];
  past: EditorTrack[][];
  future: EditorTrack[][];

  selectedTrackId: string | null;
  armedTrackIds: string[];
  selectedRegionId: string | null;

  setTracks(tracks: EditorTrack[]): void;
  selectTrack(id: string): void;
  toggleArmTrack(id: string): void;
  selectRegion(regionId: string | null): void;

  setTrackDuration(trackId: string, duration: number): void;

  addRegion(trackId: string, start: number, end: number): void;
  updateRegion(trackId: string, regionId: string, patch: Partial<Pick<EditorRegion, "start" | "end" | "edits">>): void;
  removeRegion(trackId: string, regionId: string): void;
  splitRegion(trackId: string, regionId: string, at: number): void;
  duplicateRegion(trackId: string, regionId: string): void;
  lockRegion(trackId: string, regionId: string, locked: boolean): void;

  undo(): void;
  redo(): void;

  _pushPast(): void; // internal helper
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tracks: [],
  past: [],
  future: [],

  selectedTrackId: null,
  armedTrackIds: [],
  selectedRegionId: null,

  setTracks: (tracks) => set({ tracks }),

  selectTrack: (id) => set({ selectedTrackId: id }),
  toggleArmTrack: (id) =>
    set((state) => ({
      armedTrackIds: state.armedTrackIds.includes(id)
        ? state.armedTrackIds.filter((t) => t !== id)
        : [...state.armedTrackIds, id],
    })),
  selectRegion: (regionId) => set({ selectedRegionId: regionId }),

  setTrackDuration: (trackId, duration) =>
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) return track;
        if (track.regions.length > 0) return track;

        return {
          ...track,
          regions: [createRegion(trackId, 0, duration)],
        };
      }),
    })),

  _pushPast: () => {
    const { tracks, past } = get();
    set({
      past: [...past, JSON.parse(JSON.stringify(tracks))],
      future: [],
    });
  },

  addRegion: (trackId, start, end) => {
    get()._pushPast();
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, regions: [...track.regions, createRegion(trackId, start, end)] }
          : track
      ),
    }));
  },

  updateRegion: (trackId, regionId, patch) => {
    get()._pushPast();
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) return track;

        return {
          ...track,
          regions: track.regions.map((region) => {
            if (region.id !== regionId) return region;
            if (region.meta.locked) return region;

            const isMoved =
              ("start" in patch && patch.start !== region.start) ||
              ("end" in patch && patch.end !== region.end);

            const edits = isMoved
              ? {}
              : patch.edits
              ? { ...region.edits, ...patch.edits }
              : region.edits;

            return {
              ...region,
              ...patch,
              edits,
              status:
                isMoved
                  ? "empty"
                  : region.status === "empty" && Object.keys(edits).length > 0
                  ? "edited"
                  : region.status,
              meta: {
                ...region.meta,
                updatedAt: Date.now(),
              },
            };
          }),
        };
      }),
    }));
  },

  removeRegion: (trackId, regionId) => {
    get()._pushPast();
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, regions: track.regions.filter((r) => r.id !== regionId) }
          : track
      ),
    }));
  },

  splitRegion: (trackId, regionId, at) => {
    get()._pushPast();
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) return track;

        const regions: EditorRegion[] = [];
        for (const r of track.regions) {
          if (r.id !== regionId || at <= r.start || at >= r.end) {
            regions.push(r);
            continue;
          }
          regions.push(
            { ...r, end: at, meta: { ...r.meta, updatedAt: Date.now() } },
            createRegion(trackId, at, r.end, r.id)
          );
        }
        return { ...track, regions };
      }),
    }));
  },

  duplicateRegion: (trackId, regionId) => {
    get()._pushPast();
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) return track;

        const r = track.regions.find((r) => r.id === regionId);
        if (!r) return track;

        const copy: EditorRegion = {
          ...createRegion(trackId, r.start, r.end, r.id),
          edits: { ...r.edits },
          status: r.status,
        };

        return { ...track, regions: [...track.regions, copy] };
      }),
    }));
  },

  lockRegion: (trackId, regionId, locked) => {
    get()._pushPast();
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) return track;

        return {
          ...track,
          regions: track.regions.map((r) =>
            r.id === regionId
              ? {
                  ...r,
                  status: locked ? "locked" : r.status,
                  meta: { ...r.meta, locked, updatedAt: Date.now() },
                }
              : r
          ),
        };
      }),
    }));
  },

  undo: () => {
    const { past, tracks, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    set({
      tracks: previous,
      past: past.slice(0, -1),
      future: [JSON.parse(JSON.stringify(tracks)), ...future],
    });
  },

  redo: () => {
    const { past, tracks, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    set({
      tracks: next,
      past: [...past, JSON.parse(JSON.stringify(tracks))],
      future: future.slice(1),
    });
  },
}));
