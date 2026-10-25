import { BUCKETS, DEFAULT_MIX, DEFAULT_SETTINGS, validateMix, type Mix } from "./types";

/** An error that is safe to show to the caller (UI or AI agent). */
export class RecError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface ScheduleSettings {
  frequency: "manual" | "daily" | "weekly" | "monthly";
  weekday: number; // 0 (Sunday) to 6, used when weekly
  hour: number;    // 0 to 23, in `timezone`
  timezone: string;
  mode: "replace" | "new";
}

export const DEFAULT_SCHEDULE: ScheduleSettings = {
  frequency: "manual",
  weekday: 1,
  hour: 7,
  timezone: "UTC",
  mode: "replace",
};

export interface TasteFields {
  name: string;
  description?: string;
  moods: { slug: string; weight: number }[];
  mix: Mix;
  size: number;
  exactThreshold: number;
  looseThreshold: number;
  recentDays: number;
  rediscoverAfterDays: number;
  maxPerArtist: number;
  schedule: ScheduleSettings;
  isActive: boolean;
}

export const MAX_MOODS_PER_TASTE = 8;

function bad(message: string): never {
  throw new RecError(400, message);
}

function num(v: unknown, label: string, min: number, max: number, integer = false): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
    bad(`${label} must be ${integer ? "a whole number" : "a number"} from ${min} to ${max}`);
  }
  return v as number;
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const SLUG = /^[a-z0-9-]{1,40}$/;

function parseMoods(v: unknown): { slug: string; weight: number }[] {
  if (!Array.isArray(v)) return bad("moods must be an array");
  const seen = new Set<string>();
  const out: { slug: string; weight: number }[] = [];
  for (const item of v as unknown[]) {
    const raw = typeof item === "string" ? { slug: item } : (item as { slug?: unknown; weight?: unknown });
    const slug = typeof raw?.slug === "string" ? raw.slug.trim().toLowerCase() : "";
    if (!SLUG.test(slug)) return bad("Each mood needs a valid slug");
    if (seen.has(slug)) continue;
    seen.add(slug);
    const weight = (raw as { weight?: unknown }).weight === undefined ? 1 : num((raw as { weight?: unknown }).weight, "Mood weight", 0.1, 1);
    out.push({ slug, weight });
  }
  return out;
}

function parseMix(v: unknown): Mix {
  if (!v || typeof v !== "object") return bad("mix must be an object");
  const mix = {} as Mix;
  for (const b of BUCKETS) mix[b] = (v as Record<string, number>)[b];
  const error = validateMix(mix);
  if (error) bad(error);
  return mix;
}

function parseSchedule(v: unknown, base: ScheduleSettings): ScheduleSettings {
  if (!v || typeof v !== "object") return bad("schedule must be an object");
  const s = { ...base, ...(v as Partial<ScheduleSettings>) };
  if (!["manual", "daily", "weekly", "monthly"].includes(s.frequency)) bad("schedule.frequency must be manual, daily, weekly or monthly");
  if (!["replace", "new"].includes(s.mode)) bad('schedule.mode must be "replace" or "new"');
  num(s.weekday, "schedule.weekday", 0, 6, true);
  num(s.hour, "schedule.hour", 0, 23, true);
  if (typeof s.timezone !== "string" || !isValidTimeZone(s.timezone)) bad("schedule.timezone is not a valid time zone");
  return { frequency: s.frequency, weekday: s.weekday, hour: s.hour, timezone: s.timezone, mode: s.mode };
}

const DEFAULTS: TasteFields = {
  name: "",
  moods: [],
  mix: { ...DEFAULT_MIX },
  size: DEFAULT_SETTINGS.size,
  exactThreshold: DEFAULT_SETTINGS.exactThreshold,
  looseThreshold: DEFAULT_SETTINGS.looseThreshold,
  recentDays: DEFAULT_SETTINGS.recentDays,
  rediscoverAfterDays: DEFAULT_SETTINGS.rediscoverAfterDays,
  maxPerArtist: DEFAULT_SETTINGS.maxPerArtist,
  schedule: { ...DEFAULT_SCHEDULE },
  isActive: true,
};

/**
 * Validates user (or agent) input for creating or editing a taste.
 * Pass `current` when editing; only the fields present in `body` change.
 * Returns the full merged taste plus just the fields that were provided.
 */
export function parseTasteInput(
  body: unknown,
  current?: TasteFields
): { merged: TasteFields; provided: Partial<TasteFields> } {
  if (!body || typeof body !== "object") return bad("Invalid JSON body");
  const b = body as Record<string, unknown>;
  const provided: Partial<TasteFields> = {};

  if (b.name !== undefined) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name || name.length > 60) bad("name must be 1 to 60 characters");
    provided.name = name;
  }
  if (b.description !== undefined) {
    const d = typeof b.description === "string" ? b.description.trim() : null;
    if (d === null || d.length > 300) bad("description must be text up to 300 characters");
    provided.description = d;
  }
  if (b.moods !== undefined) provided.moods = parseMoods(b.moods);
  if (b.mix !== undefined) provided.mix = parseMix(b.mix);
  if (b.size !== undefined) provided.size = num(b.size, "size", 5, 100, true);
  if (b.exactThreshold !== undefined) provided.exactThreshold = num(b.exactThreshold, "exactThreshold", 0, 1);
  if (b.looseThreshold !== undefined) provided.looseThreshold = num(b.looseThreshold, "looseThreshold", 0, 1);
  if (b.recentDays !== undefined) provided.recentDays = num(b.recentDays, "recentDays", 1, 365, true);
  if (b.rediscoverAfterDays !== undefined) {
    provided.rediscoverAfterDays = num(b.rediscoverAfterDays, "rediscoverAfterDays", 7, 3650, true);
  }
  if (b.maxPerArtist !== undefined) provided.maxPerArtist = num(b.maxPerArtist, "maxPerArtist", 1, 10, true);
  if (b.schedule !== undefined) provided.schedule = parseSchedule(b.schedule, current?.schedule ?? DEFAULTS.schedule);
  if (b.isActive !== undefined) {
    if (typeof b.isActive !== "boolean") bad("isActive must be true or false");
    provided.isActive = b.isActive as boolean;
  }

  const merged: TasteFields = { ...(current ?? DEFAULTS), ...provided };

  if (!merged.name) bad("name is required");
  if (merged.moods.length < 1) bad("Pick at least one mood");
  if (merged.moods.length > MAX_MOODS_PER_TASTE) bad(`A taste can have at most ${MAX_MOODS_PER_TASTE} moods`);
  if (merged.looseThreshold > merged.exactThreshold) bad("looseThreshold can't be higher than exactThreshold");

  return { merged, provided };
}