import { Track } from "@/store/useAudioStore";

export interface RegionEdits {
  gain?: number;          // dB
  pan?: number;           // -1..1
  playbackRate?: number;  // time stretch
  pitch?: number;         // semitones
  reverse?: boolean;
  fadeIn?: number;        // seconds
  fadeOut?: number;       // seconds
  mute?: boolean;
}

export interface RegionMeta {
  label?: string;
  color?: string;

  createdAt: number;
  updatedAt: number;

  locked?: boolean;

  // lineage (split / duplicate safety)
  originRegionId?: string;
}

export interface EditorRegion {
  id: string;
  sourceTrackId: string;

  start: number;
  end: number;

  edits: RegionEdits;

  status: "empty" | "edited" | "locked";
  parentRegionId?: string | null;
  meta: RegionMeta;
}

export interface EditorTrack {
  id: string;
  source: Track;

  duration: number;
  regions: EditorRegion[];

  gain: number;
  pan: number;
  muted: boolean;
  solo?: boolean;

  // caching
  peaks: number[] | null;  // for WaveSurfer
  audioBuffer?: AudioBuffer | null; // for Engine
}




export interface EditorProject {
  id: string;
  ownerId: string;

  bpm?: number;
  sampleRate: number;

  tracks: EditorTrack[];

  duration: number;

  createdAt: number;
  updatedAt: number;
}
