// Daily / weekly / monthly mixes. Pure and dependency-free, so both the server
// and the browser can use the labels and the same "which day is it?" logic.

export type PeriodKind = "daily" | "weekly" | "monthly";
export type RunKind = "manual" | PeriodKind;

export interface PeriodInfo {
  id: PeriodKind;
  /** Short button label */
  button: string;
  /** Used in playlist titles */
  mixName: string;
  /** Small badge on cards */
  badge: string;
}

export const PERIODS: PeriodInfo[] = [
  { id: "daily", button: "Today", mixName: "Daily mix", badge: "Daily" },
  { id: "weekly", button: "This week", mixName: "Weekly mix", badge: "Weekly" },
  { id: "monthly", button: "This month", mixName: "Monthly mix", badge: "Monthly" },
];

export const isPeriod = (v: unknown): v is PeriodKind => v === "daily" || v === "weekly" || v === "monthly";

/** The calendar date (YYYY-MM-DD) it currently is in a given time zone. */
export function localDate(at: Date, timeZone = "UTC"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return at.toISOString().slice(0, 10); // unknown time zone: fall back to UTC
  }
}

/** Identifies the current day, week (starting Monday) or month for someone in `timeZone`. */
export function periodKey(kind: PeriodKind, at: Date, timeZone = "UTC"): string {
  const date = localDate(at, timeZone);
  if (kind === "daily") return date;
  if (kind === "monthly") return date.slice(0, 7);

  const [y, m, d] = date.split("-").map(Number);
  const monday = new Date(Date.UTC(y, m - 1, d));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return `week-${monday.toISOString().slice(0, 10)}`;
}

/**
 * Same all day / all week / all month, so a "daily mix" is stable until the
 * period rolls over, then changes by itself.
 */
export function periodSeed(kind: PeriodKind, tasteId: string, at: Date, timeZone = "UTC"): string {
  return `${tasteId}:${periodKey(kind, at, timeZone)}`;
}

export function mixTitle(
  name: string,
  kind: RunKind,
  mode: "replace" | "new",
  at: Date,
  timeZone = "UTC"
): string {
  if (mode === "new") return `${name} · ${localDate(at, timeZone)}`;
  const label = kind === "manual" ? "Mix" : PERIODS.find(p => p.id === kind)!.mixName;
  return `${name} · ${label}`;
}

/**
 * Is this existing mix still today's (this week's, this month's) mix, and
 * still up to date with the taste? If so there's nothing to rebuild.
 */
export function canReuseMix(
  existing: { generated?: { seed?: string; generatedAt?: Date | string } } | null | undefined,
  seed: string,
  tasteUpdatedAt?: Date | string
): boolean {
  if (!existing?.generated || existing.generated.seed !== seed) return false;
  const made = existing.generated.generatedAt ? new Date(existing.generated.generatedAt).getTime() : 0;
  const edited = tasteUpdatedAt ? new Date(tasteUpdatedAt).getTime() : 0;
  return made >= edited;
}