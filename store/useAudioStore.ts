import { create } from "zustand";
import { Howl } from "howler";

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  prev?: Track;
  next?: Track;
}

interface AudioState {
  currentTrack: Track | null;
  howl: Howl | null;
  isPlaying: boolean;
  volume: number;
  
  unload: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentTrack: {id: "123", title: "me & you", artist: "RUSS", url: "/MeYou.mp3"},
  howl: null,
  isPlaying: false,
  volume: 1,

  playTrack: (track: Track) => {
    const old = get().howl;
    if (old) old.unload();

    const sound = new Howl({
      src: [track.url],
      html5: true,
      volume: get().volume,
      onend: () => console.log("Track finished."),
    });

    sound.play();
    set({ currentTrack: track, howl: sound, isPlaying: true });
  },

  togglePlay: () => {
    const { howl, isPlaying } = get();
    if (!howl) return;
    if (isPlaying) howl.pause();
    else howl.play();
    set({ isPlaying: !isPlaying });
  },

  stop: () => {
    const { howl } = get();
    if (!howl) return;
    howl.stop();
    set({ isPlaying: false });
  },

  unload: () => {
    const { howl } = get();
    if (howl) howl.unload();
    set({ currentTrack: null, howl: null, isPlaying: false });
  },

  setVolume: (v: number) => {
    const { howl } = get();
    if (howl) howl.volume(v);
    set({ volume: v });
  },

    nextTrack: () => {
    const { currentTrack } = get();
    if (!currentTrack?.next) return;
    get().playTrack(currentTrack.next);
    },

    prevTrack: () => {
    const { currentTrack } = get();
    if (!currentTrack?.prev) return;
    get().playTrack(currentTrack.prev);
    },
}));