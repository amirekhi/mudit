import type { ClipEdits } from "@/types/slateTypes";
import {
  LIMITS,
  PROJECT_VERSION,
  type SerializedClip,
  type SerializedProject,
  type SerializedRegion,
  type SerializedRegionMeta,
  type SerializedSlate,
} from "./projectTypes";

/**
 * Server-side gatekeeper for project data. Nothing from the request is stored as-is:
 * every field is checked and COPIED into a fresh object, unknown fields are dropped, numbers
 * must be finite and in range, and counts and sizes are capped. A client can't use the
 * projects collection as free-form storage.
 */

type Ok<T> = { ok: true; value: T };
type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const ok = <T,>(value: T): Ok<T> => ({ ok: true, value });

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;

const id = (v: unknown): string | null => (typeof v === "string" && ID.test(v) ? v : null);
const trackId = (v: unknown): string | null =>
  typeof v === "string" && OBJECT_ID.test(v) ? v.toLowerCase() : null;

function validateEdits(raw: unknown): Ok<ClipEdits> | Fail {
  if (raw === undefined || raw === null) return ok({});
  if (!isObj(raw)) return fail("Invalid clip edits");

  const out: ClipEdits = {};
  const ranges: Array<["gain" | "pan" | "playbackRate" | "pitch" | "fadeIn" | "fadeOut", number, number]> = [
    ["gain", -120, 120],
    ["pan", -1, 1],
    ["playbackRate", 0.01, 100],
    ["pitch", -96, 96],
    ["fadeIn", 0, 3600],
    ["fadeOut", 0, 3600],
  ];
  for (const [key, min, max] of ranges) {
    if (raw[key] === undefined) continue;
    const n = num(raw[key], min, max);
    if (n === null) return fail(`Invalid edit value: ${key}`);
    out[key] = n;
  }
  for (const key of ["reverse", "mute"] as const) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== "boolean") return fail(`Invalid edit value: ${key}`);
    out[key] = raw[key] as boolean;
  }
  return ok(out);
}

function validateRegionMeta(raw: unknown): Ok<SerializedRegionMeta> | Fail {
  if (!isObj(raw)) return fail("Invalid region meta");
  const createdAt = num(raw.createdAt, 0, 4e12);
  const updatedAt = num(raw.updatedAt, 0, 4e12);
  if (createdAt === null || updatedAt === null) return fail("Invalid region timestamps");

  const meta: SerializedRegionMeta = { createdAt, updatedAt };
  if (raw.locked !== undefined) {
    if (typeof raw.locked !== "boolean") return fail("Invalid region lock flag");
    meta.locked = raw.locked;
  }
  if (raw.label !== undefined) {
    if (typeof raw.label !== "string" || raw.label.length > 100) return fail("Invalid region label");
    meta.label = raw.label;
  }
  if (raw.color !== undefined) {
    if (typeof raw.color !== "string" || raw.color.length > 32) return fail("Invalid region color");
    meta.color = raw.color;
  }
  if (raw.originRegionId !== undefined) {
    const origin = id(raw.originRegionId);
    if (!origin) return fail("Invalid region origin id");
    meta.originRegionId = origin;
  }
  return ok(meta);
}

function validateClip(raw: unknown): Ok<SerializedClip> | Fail {
  if (!isObj(raw)) return fail("Invalid clip");
  const clipId = id(raw.id);
  const source = trackId(raw.sourceTrackId);
  const sourceStart = num(raw.sourceStart, 0, LIMITS.maxSeconds);
  const sourceEnd = num(raw.sourceEnd, 0, LIMITS.maxSeconds);
  const offset = num(raw.offset, 0, LIMITS.maxSeconds);
  if (!clipId || !source || sourceStart === null || sourceEnd === null || offset === null) {
    return fail("Invalid clip fields");
  }
  if (sourceEnd < sourceStart) return fail("Clip ends before it starts");

  const edits = validateEdits(raw.edits);
  if (!edits.ok) return edits;
  return ok({ id: clipId, sourceTrackId: source, sourceStart, sourceEnd, offset, edits: edits.value });
}

function validateRegion(raw: unknown, slateId: string, counter: { clips: number }): Ok<SerializedRegion> | Fail {
  if (!isObj(raw)) return fail("Invalid region");
  const regionId = id(raw.id);
  const start = num(raw.start, 0, LIMITS.maxSeconds);
  const end = num(raw.end, 0, LIMITS.maxSeconds);
  if (!regionId || start === null || end === null) return fail("Invalid region fields");
  if (end < start) return fail("Region ends before it starts");

  const status = raw.status;
  if (status !== "empty" && status !== "edited" && status !== "locked") return fail("Invalid region status");

  let parentRegionId: string | null = null;
  if (raw.parentRegionId !== undefined && raw.parentRegionId !== null) {
    parentRegionId = id(raw.parentRegionId);
    if (!parentRegionId) return fail("Invalid parent region id");
  }

  if (!Array.isArray(raw.clips) || raw.clips.length > LIMITS.maxClipsPerRegion) {
    return fail("Too many clips in a region");
  }
  const clips: SerializedClip[] = [];
  for (const c of raw.clips) {
    counter.clips++;
    if (counter.clips > LIMITS.maxTotalClips) return fail("Too many clips in the project");
    const clip = validateClip(c);
    if (!clip.ok) return clip;
    clips.push(clip.value);
  }

  const meta = validateRegionMeta(raw.meta);
  if (!meta.ok) return meta;

  // A region always belongs to the slate that contains it
  return ok({ id: regionId, slateId, start, end, clips, parentRegionId, status, meta: meta.value });
}

function validateSlate(raw: unknown, counter: { clips: number }): Ok<SerializedSlate> | Fail {
  if (!isObj(raw)) return fail("Invalid slate");
  const slateId = id(raw.id);
  if (!slateId) return fail("Invalid slate id");

  if (typeof raw.name !== "string" || raw.name.length > 100) return fail("Invalid slate name");
  if (raw.kind !== "single" && raw.kind !== "project") return fail("Invalid slate kind");

  const length = num(raw.length, 0, LIMITS.maxSeconds);
  const gain = num(raw.gain, -120, 120);
  const pan = num(raw.pan, -1, 1);
  if (length === null || gain === null || pan === null) return fail("Invalid slate numbers");
  if (typeof raw.muted !== "boolean") return fail("Invalid slate mute flag");

  let sourceTrackId: string | undefined;
  if (raw.sourceTrackId !== undefined && raw.sourceTrackId !== null) {
    const t = trackId(raw.sourceTrackId);
    if (!t) return fail("Invalid slate source track");
    sourceTrackId = t;
  }

  if (!isObj(raw.meta)) return fail("Invalid slate meta");
  const createdAt = num(raw.meta.createdAt, 0, 4e12);
  const updatedAt = num(raw.meta.updatedAt, 0, 4e12);
  if (createdAt === null || updatedAt === null) return fail("Invalid slate timestamps");

  if (!Array.isArray(raw.regions) || raw.regions.length > LIMITS.maxRegionsPerSlate) {
    return fail("Too many regions in a slate");
  }
  const regions: SerializedRegion[] = [];
  for (const r of raw.regions) {
    const region = validateRegion(r, slateId, counter);
    if (!region.ok) return region;
    regions.push(region.value);
  }

  const slate: SerializedSlate = {
    id: slateId,
    name: raw.name,
    kind: raw.kind,
    regions,
    length,
    gain,
    pan,
    muted: raw.muted,
    meta: { createdAt, updatedAt },
  };
  if (sourceTrackId) slate.sourceTrackId = sourceTrackId;
  return ok(slate);
}

export function validateProjectData(raw: unknown): Ok<SerializedProject> | Fail {
  if (!isObj(raw)) return fail("Project data is missing");
  if (raw.version !== PROJECT_VERSION) return fail("Unsupported project version");

  if (!Array.isArray(raw.slates) || raw.slates.length > LIMITS.maxSlates) {
    return fail(`A project can have at most ${LIMITS.maxSlates} slates`);
  }

  const counter = { clips: 0 };
  const slates: SerializedSlate[] = [];
  const seen = new Set<string>();
  for (const s of raw.slates) {
    const slate = validateSlate(s, counter);
    if (!slate.ok) return slate;
    if (seen.has(slate.value.id)) return fail("Duplicate slate id");
    seen.add(slate.value.id);
    slates.push(slate.value);
  }

  const armed: string[] = [];
  if (raw.armedSlateIds !== undefined) {
    if (!Array.isArray(raw.armedSlateIds) || raw.armedSlateIds.length > LIMITS.maxSlates) {
      return fail("Invalid armed slates");
    }
    for (const a of raw.armedSlateIds) {
      const armedId = id(a);
      if (!armedId) return fail("Invalid armed slate id");
      if (seen.has(armedId) && !armed.includes(armedId)) armed.push(armedId);
    }
  }

  if (!isObj(raw.master) || !isObj(raw.master.limiter)) return fail("Invalid master settings");
  const volume = num(raw.master.volume, 0, 1);
  const ceiling = num(raw.master.limiter.ceiling, 0.5, 1);
  if (volume === null || ceiling === null) return fail("Invalid master numbers");
  if (typeof raw.master.muted !== "boolean" || typeof raw.master.limiter.enabled !== "boolean") {
    return fail("Invalid master flags");
  }

  const value: SerializedProject = {
    version: PROJECT_VERSION,
    slates,
    armedSlateIds: armed,
    master: { volume, muted: raw.master.muted, limiter: { enabled: raw.master.limiter.enabled, ceiling } },
  };

  if (JSON.stringify(value).length > LIMITS.maxDataBytes) return fail("Project is too large to save");
  return ok(value);
}

/** Every track id a project points at (clips and single slates), de-duplicated. */
export function sourceTrackIdsOf(data: SerializedProject): string[] {
  const ids = new Set<string>();
  for (const slate of data.slates) {
    if (slate.sourceTrackId) ids.add(slate.sourceTrackId);
    for (const region of slate.regions) for (const clip of region.clips) ids.add(clip.sourceTrackId);
  }
  return [...ids];
}
