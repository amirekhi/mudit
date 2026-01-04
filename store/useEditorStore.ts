"use client";

import { create } from "zustand";
import { EditorTrack, EditorRegion } from "@/types/editorTypes";
import { createRegion } from "@/lib/editor/createRegion";
import { RegionClipboard } from "@/types/clipboard";
import { collectRegionTree } from "@/lib/editor/collectRegionTree";
import { MasterChannel } from "@/types/MasterChannel";

interface EditorState {
  tracks: EditorTrack[];
  past: EditorTrack[][];
  future: EditorTrack[][];

  selectedTrackId: string | null;
  armedTrackIds: string[];
  selectedRegionId: string | null;

  clipboard: RegionClipboard | null;

  setTracks(tracks: EditorTrack[]): void;
  selectTrack(id: string): void;
  toggleArmTrack(id: string): void;
  selectRegion(regionId: string | null): void;
  createChildRegion(
  trackId: string,
  parentRegionId: string,
  start: number,
  end: number
): void;  

  setTrackDuration(trackId: string, duration: number): void;

  addRegion(trackId: string, start: number, end: number): void;
  updateRegion(
    trackId: string,
    regionId: string,
    patch: Partial<Pick<EditorRegion, "start" | "end" | "edits">>
  ): void;
  removeRegion(trackId: string, regionId: string): void;
  splitRegion(trackId: string, regionId: string, at: number): void;
  duplicateRegion(trackId: string, regionId: string): void;
  lockRegion(trackId: string, regionId: string, locked: boolean): void;

  copyRegion(trackId: string, regionId: string): void;
  cutRegion(trackId: string, regionId: string): void;
  pasteRegion(targetTrackId: string, at: number): void;
  clearClipboard(): void;

  /* ========================
     MASTER CHANNEL
     ======================== */

  master: MasterChannel;

  setMasterVolume: (value: number) => void;
  toggleMasterMute: () => void;
  setLimiterEnabled: (enabled: boolean) => void;
  setLimiterCeiling: (value: number) => void;

  undo(): void;
  redo(): void;

  _pushPast(): void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tracks: [],
  past: [],
  future: [],

  selectedTrackId: null,
  armedTrackIds: [],
  selectedRegionId: null,

  clipboard: null,


   master: {
    volume: 1,
    muted: false,
    limiter: {
      enabled: false,
      ceiling: 0.98,
    },
  },

  setMasterVolume: (value) =>
    set((state) => ({
      master: {
        ...state.master,
        volume: Math.max(0, Math.min(1, value)),
      },
    })),

  toggleMasterMute: () =>
    set((state) => ({
      master: {
        ...state.master,
        muted: !state.master.muted,
      },
    })),

  setLimiterEnabled: (enabled) =>
    set((state) => ({
      master: {
        ...state.master,
        limiter: {
          ...state.master.limiter,
          enabled,
        },
      },
    })),

  setLimiterCeiling: (value) =>
    set((state) => ({
      master: {
        ...state.master,
        limiter: {
          ...state.master.limiter,
          ceiling: Math.max(0.5, Math.min(1, value)),
        },
      },
    })),

  /* ========================
     BASIC STATE
     ======================== */

  setTracks: (tracks) => set({ tracks }),

  selectTrack: (id) => set({ selectedTrackId: id }),

  toggleArmTrack: (id) =>
    set((state) => ({
      armedTrackIds: state.armedTrackIds.includes(id)
        ? state.armedTrackIds.filter((t) => t !== id)
        : [...state.armedTrackIds, id],
    })),

  selectRegion: (regionId) => set({ selectedRegionId: regionId }),

  /* ========================
     TRACK INIT
     ======================== */

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

  /* ========================
     HISTORY
     ======================== */

  _pushPast: () => {
    const { tracks, past } = get();
    set({
      past: [...past, JSON.parse(JSON.stringify(tracks))],
      future: [],
    });
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

  /* ========================
     REGION OPS
     ======================== */

  addRegion: (trackId, start, end) => {
    get()._pushPast();
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              regions: [...track.regions, createRegion(trackId, start, end)],
            }
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
              meta: { ...region.meta, updatedAt: Date.now() },
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

  set(state => ({
    tracks: state.tracks.map(track => {
      if (track.id !== trackId) return track;

      const parent = track.regions.find(r => r.id === regionId);
      if (!parent) return track;

      if (at <= parent.start || at >= parent.end) return track;

      const left = createRegion(
        trackId,
        parent.start,
        at,
        regionId
      );

      const right = createRegion(
        trackId,
        at,
        parent.end,
        regionId
      );

      return {
        ...track,
        regions: [
          ...track.regions.filter(r => r.id !== regionId),
          parent,   // parent remains
          left,
          right,
        ],
      };
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

        return {
          ...track,
          regions: [
            ...track.regions,
            {
              ...createRegion(trackId, r.start, r.end, r.id),
              edits: { ...r.edits },
            },
          ],
        };
      }),
    }));
  },

  lockRegion: (trackId, regionId, locked) => {
    get()._pushPast();
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              regions: track.regions.map((r) =>
                r.id === regionId
                  ? {
                      ...r,
                      meta: { ...r.meta, locked, updatedAt: Date.now() },
                    }
                  : r
              ),
            }
          : track
      ),
    }));
  },

  /* ========================
     CLIPBOARD
     ======================== */

copyRegion: (trackId, regionId) => {
  const track = get().tracks.find(t => t.id === trackId);
  if (!track) return;

  const regions = collectRegionTree(track.regions, regionId);
  if (regions.length === 0) return;

  set({
    clipboard: {
      mode: "copy",
      regions: JSON.parse(JSON.stringify(regions)),
    },
  });
},

cutRegion: (trackId, regionId) => {
  const track = get().tracks.find(t => t.id === trackId);
  if (!track) return;

  const regionsToCut = collectRegionTree(track.regions, regionId);
  if (regionsToCut.length === 0) return;

  const ids = new Set(regionsToCut.map(r => r.id));

  get()._pushPast();

  set(state => ({
    clipboard: {
      mode: "cut",
      regions: JSON.parse(JSON.stringify(regionsToCut)),
    },
    tracks: state.tracks.map(t =>
      t.id === trackId
        ? { ...t, regions: t.regions.filter(r => !ids.has(r.id)) }
        : t
    ),
    selectedRegionId: null,
  }));
},


pasteRegion: (targetTrackId, at) => {
  const { clipboard } = get();
  if (!clipboard) return;

  get()._pushPast();

  set(state => ({
    tracks: state.tracks.map(track => {
      if (track.id !== targetTrackId) return track;

      const idMap = new Map<string, string>();

      // find root region (the one without parent inside clipboard)
      const root = clipboard.regions.find(
        r => !clipboard.regions.some(x => x.id === r.parentRegionId)
      );
      if (!root) return track;

      const offset = at - root.start;

      const pasted = clipboard.regions.map(r => {
        const newId = crypto.randomUUID();
        idMap.set(r.id, newId);

        return {
          ...r,
          id: newId,
          start: r.start + offset,
          end: r.end + offset,
          parentRegionId: r.parentRegionId
            ? idMap.get(r.parentRegionId) ?? null
            : null,
          sourceTrackId: r.sourceTrackId,
          meta: {
            ...r.meta,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        };
      });

      return {
        ...track,
        regions: [...track.regions, ...pasted],
      };
    }),
    clipboard: clipboard.mode === "cut" ? null : clipboard,
  }));
},
createChildRegion: (trackId, parentRegionId, start, end) => {
  get()._pushPast();

  set(state => ({
    tracks: state.tracks.map(track => {
      if (track.id !== trackId) return track;

      const parent = track.regions.find(r => r.id === parentRegionId);
      if (!parent) return track;

      // enforce containment
      if (start < parent.start || end > parent.end) return track;

      const child = createRegion(
        trackId,
        start,
        end,
        parentRegionId // 👈 REAL nesting
      );

      return {
        ...track,
        regions: [...track.regions, child],
      };
    }),
  }));
},



  clearClipboard: () => set({ clipboard: null }),
}));
