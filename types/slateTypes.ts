export interface ClipEdits {
  gain?: number;
  pan?: number;
  playbackRate?: number;
  pitch?: number;
  reverse?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  mute?: boolean;
}

export interface RegionClip {
  id: string;
  sourceTrackId: string;
  buffer: AudioBuffer;
  sourceStart: number;
  sourceEnd: number;
  offset: number;
  edits: ClipEdits;
}

export interface RegionMeta {
  label?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  originRegionId?: string;
}

export interface SlateRegion {
  id: string;
  slateId: string;
  start: number;
  end: number;
  clips: RegionClip[];
  parentRegionId?: string | null;
  status: "empty" | "edited" | "locked";
  meta: RegionMeta;
}

export type SlateKind = "single" | "project";

export interface Slate {
  id: string;
  name: string;
  kind: SlateKind;
  regions: SlateRegion[];
  length: number;
  gain: number;
  pan: number;
  muted: boolean;
  sourceTrackId?: string;
  peaks: number[] | null;
  previewPeaks: Float32Array | null;
  meta: { createdAt: number; updatedAt: number };
}