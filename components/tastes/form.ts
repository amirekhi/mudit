import { DEFAULT_MIX, DEFAULT_SETTINGS } from "@/lib/recs/types";
import { DEFAULT_SCHEDULE, type TasteFields } from "@/lib/recs/validate";
import type { TasteView } from "@/lib/TanStackQuery/Queries/tastes";

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** A blank taste with the app's defaults. */
export function newForm(): TasteFields {
  return {
    name: "",
    description: "",
    moods: [],
    mix: { ...DEFAULT_MIX },
    size: DEFAULT_SETTINGS.size,
    exactThreshold: DEFAULT_SETTINGS.exactThreshold,
    looseThreshold: DEFAULT_SETTINGS.looseThreshold,
    recentDays: DEFAULT_SETTINGS.recentDays,
    rediscoverAfterDays: DEFAULT_SETTINGS.rediscoverAfterDays,
    maxPerArtist: DEFAULT_SETTINGS.maxPerArtist,
    schedule: { ...DEFAULT_SCHEDULE, timezone: browserTimeZone() },
    isActive: true,
  };
}

/** Just the editable fields of a saved taste. */
export function toForm(t: TasteView): TasteFields {
  return {
    name: t.name,
    description: t.description ?? "",
    moods: t.moods.map(m => ({ ...m })),
    mix: { ...t.mix },
    size: t.size,
    exactThreshold: t.exactThreshold,
    looseThreshold: t.looseThreshold,
    recentDays: t.recentDays,
    rediscoverAfterDays: t.rediscoverAfterDays,
    maxPerArtist: t.maxPerArtist,
    schedule: { ...t.schedule },
    isActive: t.isActive,
  };
}