import { Track } from "@/store/useAudioStore";

export interface EditorRegion {
  id: string;

  sourceTrackId: string; // references Track._id
  start: number;
  end: number;

  offset: number;

  playbackRate: number;
  pitch: number;
}

export interface EditorTrack {
  id: string;
  source: Track;

  regions: EditorRegion[];

  gain: number;
  pan: number;
  muted: boolean;
}

export interface EditorProject {
  id: string;
  ownerId: string;

  bpm?: number;
  sampleRate: number;

  tracks: EditorTrack[];

  duration: number;
}
