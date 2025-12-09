// stores/usePlaylistStore.ts
import { create } from "zustand";
import { Track } from "./useAudioStore";

interface PlaylistState {
  
  playlist: Track[];
  currentTrackIndex: number | null;
  isPlaying: boolean;

  setPlaylist: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  clearPlaylist: () => void;

  currentPlaylist: string | null;
  setCurrentPlaylist: (id: string) => void;


  playTrack: (index: number) => void;
  togglePlay: () => void;
  pause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlist: [],
  currentTrackIndex: null,
  currentPlaylist: null,
  isPlaying: false,
  
  setCurrentPlaylist: (id: string) => set({ currentPlaylist: id }),

  setPlaylist: (tracks) => set({ playlist: tracks }),
  addTrack: (track) => set((s) => ({ playlist: [...s.playlist, track] })),
  removeTrack: (id) =>
    set((s) => ({ playlist: s.playlist.filter((t) => t.id !== id) })),
  clearPlaylist: () => set({ playlist: [], currentTrackIndex: null, isPlaying: false }),

  playTrack: (index) => set({ currentTrackIndex: index, isPlaying: true }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  pause: () => set({ isPlaying: false }),

  nextTrack: () =>
    set((s) => {
      if (s.currentTrackIndex === null) return {};
      const nextIndex = (s.currentTrackIndex + 1) % s.playlist.length;
      return { currentTrackIndex: nextIndex, isPlaying: true };
    }),
  prevTrack: () =>
    set((s) => {
      if (s.currentTrackIndex === null) return {};
      const prevIndex =
        (s.currentTrackIndex - 1 + s.playlist.length) % s.playlist.length;
      return { currentTrackIndex: prevIndex, isPlaying: true };
    }),
}));
