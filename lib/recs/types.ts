// Shared types for the recommendation system. Plain TypeScript with no
// framework or database imports, so the generator can run anywhere: an API
// route, a cron job, a test, or an AI agent's tool.

export const BUCKETS = ["recent", "exactMood", "newMood", "random", "rediscover"] as const;
export type Bucket = (typeof BUCKETS)[number];

/** Whole-number percentages that add up to 100. */
export type Mix = Record<Bucket, number>;

export const DEFAULT_MIX: Mix = {
  recent: 30,     // played recently
  exactMood: 40,  // strong match for the taste's moods
  newMood: 10,    // never played, matches the moods
  random: 10,     // wildcard
  rediscover: 10, // played before, but not for a long while
};

export const DEFAULT_SETTINGS = {
  size: 30,
  exactThreshold: 0.6,      // mood match needed for the "exact mood" bucket
  looseThreshold: 0.3,      // mood match needed for the softer buckets
  recentDays: 14,           // "recently played" window
  rediscoverAfterDays: 60,  // "not played for a while" cut-off
  maxPerArtist: 2,          // variety cap inside one playlist
} as const;

/** Returns an error message, or null when the mix is valid. */
export function validateMix(mix: Partial<Mix>): string | null {
  let sum = 0;
  for (const b of BUCKETS) {
    const v = mix[b];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100) {
      return `${b} must be a whole number from 0 to 100`;
    }
    sum += v;
  }
  return sum === 100 ? null : `Percentages must add up to 100 (currently ${sum})`;
}

export interface TasteMood {
  slug: string;
  /** How much this mood matters inside the taste (0.1 to 1). */
  weight: number;
}

/** The part of a Taste the generator needs. */
export interface TasteConfig {
  moods: TasteMood[];
  mix: Mix;
  size: number;
  exactThreshold: number;
  looseThreshold: number;
  recentDays: number;
  rediscoverAfterDays: number;
  maxPerArtist: number;
}

/** A track the user is allowed to hear, with what we know about it. */
export interface Candidate {
  trackId: string;
  artist: string;
  /** mood slug -> score (0 to 1). Empty = not tagged yet. */
  moods: Record<string, number>;
  /** This user's history with the track. Missing = never played. */
  stats?: {
    plays: number;
    skips: number;
    /** epoch milliseconds */
    lastPlayedAt?: number;
  };
}

export interface GenerateInput {
  candidates: Candidate[];
  taste: TasteConfig;
  /** epoch milliseconds, passed in so results are reproducible */
  now: number;
  /** Same seed + same input = same playlist. Change it to reshuffle. */
  seed: string | number;
  excludeTrackIds?: Set<string>;
}

export interface GeneratedItem {
  trackId: string;
  bucket: Bucket;
  /** Higher = stronger pick inside its bucket (useful for tuning). */
  score: number;
  /** True when another bucket ran short and this track filled the gap. */
  backfill?: boolean;
  /** Short human-readable explanation, also usable by an AI agent. */
  reason: string;
  detail: {
    match: number;
    topMood: string | null;
    daysSincePlayed: number | null;
    plays: number;
  };
}

export interface BucketReport {
  requested: number;
  filled: number;
  backfilled: number;
}

export interface GenerateResult {
  items: GeneratedItem[];
  report: Record<Bucket, BucketReport>;
  warnings: string[];
  seed: string;
}