"use client";

import { create } from "zustand";
import { EditorTrack, EditorRegion } from "@/types/editorTypes";
import { createRegion } from "@/lib/editor/createRegion";
import { RegionClipboard } from "@/types/clipboard";
import { collectRegionTree } from "@/lib/editor/collectRegionTree";
import { MasterChannel } from "@/types/MasterChannel";
import { TransportState } from "@/types/transport";
import { useEngineStore } from "./useEngineStore";

interface EditorState {
  tracks: EditorTrack[];
  past: EditorTrack[][];
  future: EditorTrack[][];

  setPreviewPeaks(trackId: string, peaks: Float32Array): void;
  updateRegionVisuals(trackId: string): void;
  updateRegionWindow(trackId: string, regionId: string, start: number, end: number): void;
  updateRegionPlaybackRate(trackId: string, regionId: string, value: number): void;


  selectedTrackId: string | null;
  armedTrackIds: string[];
  selectedRegionId: string | null;

  clipboard: RegionClipboard | null;
  transport: TransportState;

  projectTracks: string[];
 
  setTrackAudioBuffer(trackId: string, buffer: AudioBuffer | null): void;
  setTrackPeaks(trackId: string, peaks: number[]): void;

  play(): void;
  pause(): void;
  seek(time: number): void;
  setTransportDuration(duration: number): void;
  _tick(dt: number): void;
  
  addTrackToProject(trackId: string): void;
  removeTrackFromProject(trackId: string): void; 
  setTransportDurationIfLonger(trackId: string, duration: number): void;

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

     transport: {
      time: 0,
      isPlaying: false,
      rate: 1,
      pxPerSecond: 100,
      syncedTrackIds: new Set<string>(),
      duration: 0,
    },


  // store/editorStore.ts
  projectTracks: [] as string[], // just the track IDs

  updateRegionVisuals: (trackId: string) => {
  const state = get();

  const track = state.tracks.find(t => t.id === trackId);
  if (!track) return;

  let shift = 0; // cumulative delta for cascading regions

  const newRegions = track.regions.map(r => {
    const originalDuration = r.sourceEnd - r.sourceStart;
    const playbackRate = r.edits.playbackRate ?? 1;

    // Visual duration = actual audio duration divided by playbackRate
    const visualDuration = originalDuration / playbackRate;

    const newStart = r.start + shift;
    const newEnd = newStart + visualDuration;

    const delta = (r.end - r.start) - visualDuration; // old visual - new visual
    shift -= delta; // cascade to next regions

    return {
      ...r,
      start: newStart,
      end: newEnd,
      // ⚠️ do NOT touch sourceStart/sourceEnd
    };
  });

  // Apply updated regions to the track immutably
  set(state => ({
    tracks: state.tracks.map(t =>
      t.id === trackId ? { ...t, regions: newRegions } : t
    ),
  }));

  // Trigger audio scheduling / re-render
  useEngineStore.getState().compileTrackPreview(trackId);
},



  setPreviewPeaks(trackId, peaks) {
  set(state => {
    const index = state.tracks.findIndex(t => t.id === trackId);
    if (index === -1) return state;

    const updatedTracks = [...state.tracks];

    updatedTracks[index] = {
      ...updatedTracks[index],
      previewPeaks: peaks,
    };

    return {
      ...state,
      tracks: updatedTracks,
    };
  });
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


    //audio buffer setter
    setTrackAudioBuffer: (trackId, buffer) =>
  set(state => ({
    tracks: state.tracks.map(t =>
      t.id === trackId
        ? { ...t, audioBuffer: buffer }
        : t
    ),
  })),

  setTrackPeaks: (trackId: string, peaks: number[]) =>
  set(state => ({
    tracks: state.tracks.map(t =>
      t.id === trackId ? { ...t, peaks } : t
    ),
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

setTrackDuration: (trackId: string, duration: number) =>
  set(state => {
    const tracks = state.tracks.map(track =>
      track.id === trackId && track.regions.length === 0
        ? { ...track, duration, regions: [createRegion(trackId, 0, duration)] }
        : track
    );

    return { tracks };
  }),







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

addRegion(trackId: string, start: number, end: number) {
  set(state => {
    const track = state.tracks.find(t => t.id === trackId);
    if (!track) return state;

    const newRegion: EditorRegion = {
      id: crypto.randomUUID(),

      start,
      end,

      // 🔥 FIX HERE
      sourceStart: start,
      sourceEnd: end,

      sourceTrackId: trackId,

      edits: {},
      status: "empty",

      parentRegionId: null,

      meta: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };

    track.regions.push(newRegion);

    return { tracks: [...state.tracks] };
  });
},


updateRegionWindow: (
  trackId: string,
  regionId: string,
  start: number,
  end: number
) => {
  get()._pushPast();

  set(state => ({
    tracks: state.tracks.map(track => {
      if (track.id !== trackId) return track;

      return {
        ...track,
        regions: track.regions.map(region => {
          if (region.id !== regionId) return region;
          if (region.meta.locked) return region;

          return {
            ...region,
            start,
            end,
            sourceStart: start,
            sourceEnd: end,
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

// store/useEditorStore.ts
updateRegionPlaybackRate: (trackId: string, regionId: string, value: number) => {
  get()._pushPast();

  set(state => ({
    tracks: state.tracks.map(track => {
      if (track.id !== trackId) return track;

      return {
        ...track,
        regions: track.regions.map(region => {
          if (region.id !== regionId) return region;
          if (region.meta.locked) return region;

          return {
            ...region,
            edits: {
              ...region.edits,
              playbackRate: (region.edits.playbackRate ?? 1) * value,
            },
            meta: {
              ...region.meta,
              updatedAt: Date.now(),
            },
          };
        }),
      };
    }),
  }));

    const engine = useEngineStore.getState();
  engine?.play?.();
},


 updateRegion: (trackId, regionId, patch) => {
  get()._pushPast();

  set(state => ({
    tracks: state.tracks.map(track => {
      if (track.id !== trackId) return track;

      return {
        ...track,
        regions: track.regions.map(region => {
          if (region.id !== regionId) return region;
          if (region.meta.locked) return region;

          const oldStart = region.start;
          const oldEnd = region.end;

          const newStart = patch.start ?? oldStart;
          const newEnd = patch.end ?? oldEnd;

          const moved = newStart !== oldStart;
          const resized = newEnd !== oldEnd;

          let newSourceStart = region.sourceStart;
          let newSourceEnd = region.sourceEnd;

          // 🔥 MOVE → shift audio slice
          if (moved) {
            const delta = newStart - oldStart;
            newSourceStart += delta;
            newSourceEnd += delta;
          }

          // 🔥 RESIZE RIGHT EDGE
          if (resized) {
            const newDuration = newEnd - newStart;
            newSourceEnd = newSourceStart + newDuration;
          }

          return {
            ...region,
            ...patch,
            sourceStart: newSourceStart,
            sourceEnd: newSourceEnd,
            meta: {
              ...region.meta,
              updatedAt: Date.now(),
            },
          };
        }),
      };
    }),
  }));

  const engine = useEngineStore.getState();
  engine?.play?.();
},


removeRegion: (trackId, regionId) => {
  get()._pushPast();

  set(state => ({
    tracks: state.tracks.map(track =>
      track.id === trackId
        ? {
            ...track,
            regions: track.regions.filter(r => r.id !== regionId),
          }
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

      const splitOffset = at - parent.start;

      const left: EditorRegion = {
        ...createRegion(trackId, parent.start, at, regionId),
        sourceStart: parent.sourceStart,
        sourceEnd: parent.sourceStart + splitOffset,
      };

      const right: EditorRegion = {
        ...createRegion(trackId, at, parent.end, regionId),
        sourceStart: parent.sourceStart + splitOffset,
        sourceEnd: parent.sourceEnd,
      };

      return {
        ...track,
        regions: [
          ...track.regions.filter(r => r.id !== regionId),
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




    play: () =>
      set(state => ({
        transport: { ...state.transport, isPlaying: true },
      })),

    pause: () =>
      set(state => ({
        transport: { ...state.transport, isPlaying: false },
      })),

    seek: (time) =>
      set(state => ({
        transport: {
          ...state.transport,
          time: Math.max(0, Math.min(state.transport.duration, time)),
        },
      })),

    setTransportDuration: (duration) =>
      set(state => ({
        transport: {
          ...state.transport,
          duration: Math.max(state.transport.duration, duration),
        },
      })),

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

     


addTrackToProject(trackId: string) {
  set(state => ({
    projectTracks: [...state.projectTracks, trackId],
  }));
},

removeTrackFromProject: (trackId: string) =>
  set(state => {
    const removedTrack = state.tracks.find(t => t.id === trackId);
    if (!removedTrack) return state;

    // EARLY EXIT: If this track duration is less than transport, just remove
    if (removedTrack.duration < state.transport.duration) {
      return {
        projectTracks: state.projectTracks.filter(id => id !== trackId),
      };
    }

    // Otherwise, we need to recalc transport (only if removed track had max duration)
    const newProjectIds = state.projectTracks.filter(id => id !== trackId);
    const remainingDurations = state.tracks
      .filter(t => newProjectIds.includes(t.id))
      .map(t => t.duration);

    return {
      projectTracks: newProjectIds,
      transport: {
        ...state.transport,
        duration: remainingDurations.length > 0 ? Math.max(...remainingDurations) : 0,
      },
    };
  }),


  setTransportDurationIfLonger: (trackId: string, duration: number) =>
  set(state => {
    // Early exit: if the duration is not bigger than current transport, do nothing
    if (duration <= state.transport.duration) return state;

    return {
      transport: {
        ...state.transport,
        duration: duration,
      },
    };
  }),



  clearClipboard: () => set({ clipboard: null }),
}));
