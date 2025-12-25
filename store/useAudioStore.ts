import { create } from "zustand";
import { Howl } from "howler";

export interface Track {
  _id: string;

  title: string;
  artist: string;
  url: string;
  image?: string;

  // ownership
  ownerId?: string | null;     // null = global/system
  visibility: "public" | "private";

  // navigation (optional)
  prev?: string;
  next?: string;

  createdAt: string;
  updatedAt: string;
}



interface AudioState {
  currentTrack: Track | null;
  howl: Howl | null;
  isPlaying: boolean;
  volume: number;
  
  setTrack: (track: Track) => void; 
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

        set({ isPlaying: false });
        },
    });

    sound.play();

    set({ currentTrack: track, howl: sound, isPlaying: true });
    },

    setTrack: (track: Track) => {
  const old = get().howl;
  if (old) old.unload();

  const sound = new Howl({
    src: [track.url],
    html5: true,
    volume: get().volume,
    onend: () => set({ isPlaying: false }),
  });

  set({
    currentTrack: track,
    howl: sound,
    isPlaying: false, // 🔴 paused by default
  });
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