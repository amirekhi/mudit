import { create } from "zustand";
import { EditorTrack, EditorRegion } from "@/types/editorTypes";

interface EditorState {
  tracks: EditorTrack[];
  selectedTrackId: string | null;
  selectedRegionId: string | null;

  setTracks: (tracks: EditorTrack[]) => void;
  selectTrack: (id: string) => void;
  selectRegion: (regionId: string | null) => void;

  setTrackDuration: (trackId: string, duration: number) => void;

  addRegion: (trackId: string, region: EditorRegion) => void;
  updateRegion: (
    trackId: string,
    regionId: string,
    patch: Partial<EditorRegion>
  ) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tracks: [],
  selectedTrackId: null,
  selectedRegionId: null,

  setTracks: (tracks) => set({ tracks }),
  selectTrack: (id) => set({ selectedTrackId: id }),
  selectRegion: (regionId) => set({ selectedRegionId: regionId }),

  setTrackDuration: (trackId, duration) =>
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) return track;
        const region = track.regions[0];
        if (!region || region.end !== 0) return track;
        return {
          ...track,
          regions: [{ ...region, end: duration }],
        };
      }),
    })),

  addRegion: (trackId, region) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, regions: [...track.regions, region] }
          : track
      ),
    })),

  updateRegion: (trackId, regionId, patch) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              regions: track.regions.map((region) =>
                region.id === regionId ? { ...region, ...patch } : region
              ),
            }
          : track
      ),
    })),
}));
