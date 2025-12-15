import { create } from "zustand";
import { Howl } from "howler";

export interface Track {
  _id: string;
  title: string;
  artist: string;
  url: string;
  prev?: Track;
  next?: Track;
  image?: string;
}

interface AudioState {
  currentTrack: Track | null;
  howl: Howl | null;
  isPlaying: boolean;
  volume: number;
  
  unload: () => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentTrack: null,
  howl: null,
  isPlaying: false,
  volume: 1,

    playTrack: (track: Track) => {
    const old = get().howl;
    if (old) old.unload(); // stop previous audio

    const sound = new Howl({
        src: [track.url],
        html5: true,
        volume: get().volume,
        onend: () => {
        const { currentTrack } = get();
        if (currentTrack?.next) {
            get().playTrack(currentTrack.next); // play next track automatically
        } else {
            set({ isPlaying: false }); // no next track, just pause
        }
        },
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


}));