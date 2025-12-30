import { create } from "zustand";
import { EditorTrack, EditorRegion } from "@/types/editorTypes";
import { createEmptyRegion } from "@/lib/editor/createEmptyRegion";

interface EditorState {
  tracks: EditorTrack[];

  selectedTrackId: string | null;
  armedTrackIds: string[];
  selectedRegionId: string | null;

  setTracks: (tracks: EditorTrack[]) => void;
  selectTrack: (id: string) => void;
  toggleArmTrack: (id: string) => void;
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
  armedTrackIds: [],
  selectedRegionId: null,

  setTracks: (tracks) => set({ tracks }),

  selectTrack: (id) => set({ selectedTrackId: id }),

  toggleArmTrack: (id) =>
    set((state) => ({
      armedTrackIds: state.armedTrackIds.includes(id)
        ? state.armedTrackIds.filter(tid => tid !== id)
        : [...state.armedTrackIds, id],
    })),

  selectRegion: (regionId) => set({ selectedRegionId: regionId }),

  setTrackDuration: (trackId, duration) =>
    set((state) => ({
      tracks: state.tracks.map(track => {
        if (track.id !== trackId) return track;

        if (track.regions.length === 0) {
          return {
            ...track,
            regions: [createEmptyRegion(trackId, 0, duration)],
          };
        }

        return track;
      }),
    })),

  addRegion: (trackId, region) =>
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? { ...track, regions: [...track.regions, region] }
          : track
      ),
    })),

 updateRegion: (trackId, regionId, patch) =>
  set((state) => ({
    tracks: state.tracks.map(track => {
      if (track.id !== trackId) return track;

      const regions = [...track.regions];
      const index = regions.findIndex(r => r.id === regionId);
      if (index === -1) return track;

      const region = regions[index];

      // 🔹 Detect if region was moved
      const isMoved =
        ("start" in patch && patch.start !== region.start) ||
        ("end" in patch && patch.end !== region.end);

      const updatedRegion: EditorRegion = {
        ...region,
        ...patch,
        edits: isMoved ? {} : { ...region.edits, ...patch.edits },
        status: isMoved
          ? "empty" // reset status if moved
          : region.status === "empty" && patch.edits && Object.keys(patch.edits).length > 0
          ? "edited"
          : region.status,
      };

      regions[index] = updatedRegion;

      // 🔹 Spawn next empty region if first edit on last region
      const lastRegion = regions[regions.length - 1];
      if (
        region.status === "empty" &&
        updatedRegion.status === "edited" &&
        index === regions.length - 1
      ) {
        regions.push(
          createEmptyRegion(
            trackId,
            updatedRegion.end,
            track.regions[0]?.end ?? updatedRegion.end + 10
          )
        );
      }

      return { ...track, regions };
    }),
  })),

}));
