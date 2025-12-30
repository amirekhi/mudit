import { Track } from "@/store/useAudioStore";

export interface RegionEdits {
  gain?: number;        // dB
  playbackRate?: number;
  pitch?: number;
}

export interface EditorRegion {
  id: string;

  sourceTrackId: string;

  start: number;
  end: number;

  // editor-only
  edits: RegionEdits;

  status: "empty" | "edited" | "locked";
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
