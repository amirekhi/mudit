import type { ScheduleSettings } from "./validate";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STEP_MS = 15 * 60 * 1000;

/**
 * The next moment (after `from`) a scheduled taste is due, in the taste's own
 * time zone (monthly = the 1st). Returns null for manual tastes. No date library needed: it walks
 * forward in 15-minute steps (which also covers half-hour time zones) and
 * checks the local clock, so daylight-saving changes are handled for free.
 */
export function computeNextRun(schedule: ScheduleSettings, from: Date = new Date()): Date | null {
  if (schedule.frequency === "manual") return null;

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: schedule.timezone,
    weekday: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });

  const days = schedule.frequency === "monthly" ? 32 : 8;
  const limit = from.getTime() + days * 24 * 60 * 60 * 1000;
  for (let t = Math.floor(from.getTime() / STEP_MS) * STEP_MS + STEP_MS; t <= limit; t += STEP_MS) {
    const parts = fmt.formatToParts(new Date(t));
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
    if (Number(get("hour")) !== schedule.hour || Number(get("minute")) !== 0) continue;
    if (schedule.frequency === "weekly" && DAY_NAMES.indexOf(get("weekday")) !== schedule.weekday) continue;
    if (schedule.frequency === "monthly" && Number(get("day")) !== 1) continue; // the 1st of the month
    return new Date(t);
  }
  return null;
}