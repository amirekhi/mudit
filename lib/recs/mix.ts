import { BUCKETS, type Bucket, type Mix } from "./types";

/**
 * Moves one slider and rebalances the others so the total stays exactly 100.
 * The other (unlocked) buckets give up or take the difference in proportion to
 * how big they are now. Locked buckets never change. Always returns whole
 * numbers that add up to 100.
 */
export function rebalanceMix(mix: Mix, key: Bucket, value: number, locked: ReadonlySet<Bucket> = new Set()): Mix {
  const lockedOthers = BUCKETS.filter(b => b !== key && locked.has(b));
  const free = BUCKETS.filter(b => b !== key && !locked.has(b));
  const lockedSum = lockedOthers.reduce((sum, b) => sum + mix[b], 0);

  // This bucket can't take more than what the locked ones leave over.
  const maxForKey = 100 - lockedSum;
  const next: Mix = { ...mix };

  if (free.length === 0) {
    next[key] = maxForKey;
    return next;
  }

  const v = Math.max(0, Math.min(maxForKey, Math.round(value)));
  next[key] = v;

  const remaining = 100 - lockedSum - v;
  const freeSum = free.reduce((sum, b) => sum + mix[b], 0);

  // Proportional share for each free bucket, then hand out the rounding
  // leftovers to the largest fractions so the total is exact.
  const shares = free.map(b => ({ b, raw: freeSum > 0 ? (mix[b] / freeSum) * remaining : remaining / free.length }));
  let used = 0;
  for (const s of shares) {
    next[s.b] = Math.floor(s.raw);
    used += next[s.b];
  }
  const byFraction = [...shares].sort((a, b) => (b.raw - Math.floor(b.raw)) - (a.raw - Math.floor(a.raw)));
  for (let i = 0; used < remaining; i++, used++) next[byFraction[i % byFraction.length].b]++;

  return next;
}

export interface MixPreset {
  id: string;
  label: string;
  description: string;
  mix: Mix;
}

export const MIX_PRESETS: MixPreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "A bit of everything",
    mix: { recent: 30, exactMood: 40, newMood: 10, random: 10, rediscover: 10 },
  },
  {
    id: "mood",
    label: "Stick to the mood",
    description: "Mostly songs that fit",
    mix: { recent: 10, exactMood: 70, newMood: 10, random: 5, rediscover: 5 },
  },
  {
    id: "explorer",
    label: "Explorer",
    description: "Lots of new music",
    mix: { recent: 10, exactMood: 30, newMood: 35, random: 15, rediscover: 10 },
  },
  {
    id: "comfort",
    label: "Comfort zone",
    description: "Songs you already know",
    mix: { recent: 45, exactMood: 30, newMood: 0, random: 0, rediscover: 25 },
  },
];