import type { ClipEdits } from "@/types/slateTypes";

/** Bump when the stored shape changes, so old projects can be migrated on load. */
export const PROJECT_VERSION = 1;

export const LIMITS = {
  maxBodyBytes: 1_500_000,
  maxDataBytes: 1_000_000,
  maxProjectsPerUser: 50,
  maxSlates: 50,
  maxRegionsPerSlate: 500,
  maxClipsPerRegion: 50,
  maxTotalClips: 3000,
  maxSeconds: 604_800,
} as const;

/**
 * What gets stored. Audio itself is never stored: clips only reference a track id plus the
 * slice and edits applied to it. The AudioBuffers are decoded again when a project is opened.
 */
export interface SerializedClip {
  id: string;
  sourceTrackId: string;
  sourceStart: number;
  sourceEnd: number;
  offset: number;
  edits: ClipEdits;
}

export interface SerializedRegionMeta {
  label?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  originRegionId?: string;
}

export interface SerializedRegion {
  id: string;
  slateId: string;
  start: number;
  end: number;
  clips: SerializedClip[];
  parentRegionId: string | null;
  status: "empty" | "edited" | "locked";
  meta: SerializedRegionMeta;
}

export interface SerializedSlate {
  id: string;
  name: string;
  kind: "single" | "project";
  regions: SerializedRegion[];
  length: number;
  gain: number;
  pan: number;
  muted: boolean;
  sourceTrackId?: string;
  meta: { createdAt: number; updatedAt: number };
}

export interface SerializedProject {
  version: number;
  slates: SerializedSlate[];
  armedSlateIds: string[];
  master: { volume: number; muted: boolean; limiter: { enabled: boolean; ceiling: number } };
}
