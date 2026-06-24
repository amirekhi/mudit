import { create } from "zustand";
import { Track, useAudioStore } from "./useAudioStore";

interface PlaylistState {
  playlist: Track[];
  currentTrackIndex: number | null;
  isPlaying: boolean;
  currentPlaylist: string | null;
  isOpen: boolean;                          // 👈 moved out of component

  setPlaylist: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  clearPlaylist: () => void;
  setCurrentPlaylist: (id: string | null) => void;
  openWindow: () => void;                   // 👈 new
  closeWindow: () => void;                  // 👈 new
  toggleWindow: () => void;                 // 👈 new

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
  isOpen: false,

  setCurrentPlaylist: (id) => set({ currentPlaylist: id }),
  openWindow:  ()  => set({ isOpen: true }),
  closeWindow: ()  => set({ isOpen: false }),
  toggleWindow: () => set(s => ({ isOpen: !s.isOpen })),

  setPlaylist: (tracks) => set({ playlist: tracks }),
  addTrack:    (track)  => set(s => ({ playlist: [...s.playlist, track] })),
  removeTrack: (id)     => set(s => ({ playlist: s.playlist.filter(t => t._id !== id) })),
  clearPlaylist: ()     => set({ playlist: [], currentTrackIndex: null, isPlaying: false }),

  playTrack: (index) => {
    const tracks = get().playlist;
    if (!tracks[index]) return;
    set({ currentTrackIndex: index, isPlaying: true });
    useAudioStore.getState().playTrack(tracks[index]);
  },

  togglePlay: () => {
    set(s => ({ isPlaying: !s.isPlaying }));
    useAudioStore.getState().togglePlay();
  },

  pause: () => {
    set({ isPlaying: false });
    useAudioStore.getState().stop();
  },

  nextTrack: () => {
    const { playlist, currentTrackIndex } = get();
    if (currentTrackIndex === null || !playlist.length) return;
    const next = (currentTrackIndex + 1) % playlist.length;
    set({ currentTrackIndex: next, isPlaying: true });
    useAudioStore.getState().playTrack(playlist[next]);
  },

  prevTrack: () => {
    const { playlist, currentTrackIndex } = get();
    if (currentTrackIndex === null || !playlist.length) return;
    const prev = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    set({ currentTrackIndex: prev, isPlaying: true });
    useAudioStore.getState().playTrack(playlist[prev]);
  },
}));