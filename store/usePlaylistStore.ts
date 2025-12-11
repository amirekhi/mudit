import { create } from "zustand";
import { Track, useAudioStore } from "./useAudioStore";

interface PlaylistState {
  playlist: Track[];
  currentTrackIndex: number | null;
  isPlaying: boolean;

  setPlaylist: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  clearPlaylist: () => void;

  currentPlaylist: string | null;
  setCurrentPlaylist: (id: string | null) => void;

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

  setCurrentPlaylist: (id: string | null) => set({ currentPlaylist: id }),
  setPlaylist: (tracks) => set({ playlist: tracks }),
  addTrack: (track) => set((s) => ({ playlist: [...s.playlist, track] })),
  removeTrack: (id) =>
    set((s) => ({ playlist: s.playlist.filter((t) => t.id !== id) })),
  clearPlaylist: () =>
    set({ playlist: [], currentTrackIndex: null, isPlaying: false }),

  playTrack: (index) => {
    const tracks = get().playlist;
    if (!tracks[index]) return;

    set({ currentTrackIndex: index, isPlaying: true });

    // Update the audio store
    useAudioStore.getState().playTrack(tracks[index]);
  },

  togglePlay: () => {
    set((s) => ({ isPlaying: !s.isPlaying }));
    useAudioStore.getState().togglePlay();
  },

  pause: () => {
    set({ isPlaying: false });
    useAudioStore.getState().stop();
  },

  nextTrack: () => {
    const { playlist, currentTrackIndex } = get();
    if (currentTrackIndex === null || playlist.length === 0) return;

    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    set({ currentTrackIndex: nextIndex, isPlaying: true });

    useAudioStore.getState().playTrack(playlist[nextIndex]);
  },

  prevTrack: () => {
    const { playlist, currentTrackIndex } = get();
    if (currentTrackIndex === null || playlist.length === 0) return;

    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    set({ currentTrackIndex: prevIndex, isPlaying: true });

    useAudioStore.getState().playTrack(playlist[prevIndex]);
  },
}));
