import {
  BUCKETS,
  type Bucket,
  type Candidate,
  type GenerateInput,
  type GenerateResult,
  type GeneratedItem,
  type Mix,
} from "./types";

/**
 * Builds a playlist from a taste's mix (recent / exact mood / new / random /
 * rediscover). Pure function: no database, no clock, no global randomness.
 * The caller loads the candidates; this decides which ones to use and why.
 */

const DAY_MS = 86_400_000;

// ── seeded randomness (same seed = same playlist) ──

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/** Splits `size` between buckets by percentage (largest remainder, so it always adds up). */
export function allocate(mix: Mix, size: number): Record<Bucket, number> {
  const raw = BUCKETS.map(b => ({ b, raw: (mix[b] / 100) * size }));
  const out = {} as Record<Bucket, number>;
  let used = 0;
  for (const r of raw) {
    out[r.b] = Math.floor(r.raw);
    used += out[r.b];
  }
  const byRemainder = [...raw].sort((a, b) => (b.raw - Math.floor(b.raw)) - (a.raw - Math.floor(a.raw)));
  for (let i = 0; used < size; i++, used++) out[byRemainder[i % byRemainder.length].b]++;
  return out;
}

interface Scored {
  c: Candidate;
  artistKey: string;
  match: number;
  tagged: boolean;
  daysSince: number | null;
  plays: number;
  skips: number;
  topMood: string | null;
}

interface Ranked {
  s: Scored;
  score: number;
}

// Specific buckets fill first so broad ones (exact mood, random) can't use up
// the tracks the narrow ones need.
const FILL_ORDER: Bucket[] = ["recent", "rediscover", "newMood", "exactMood", "random"];

export function generatePlaylist(input: GenerateInput): GenerateResult {
  const { candidates, taste, now } = input;
  const seed = String(input.seed);
  const rand = mulberry32(hashSeed(seed));
  const jitter = () => 0.75 + 0.5 * rand(); // small shuffle so equal scores vary

  const totalWeight = taste.moods.reduce((sum, m) => sum + m.weight, 0) || 1;

  // 1. Score every candidate against the taste
  const pool: Scored[] = [];
  for (const c of candidates) {
    if (input.excludeTrackIds?.has(c.trackId)) continue;

    const plays = c.stats?.plays ?? 0;
    const skips = c.stats?.skips ?? 0;
    if (skips >= 3 && skips > plays) continue; // the user clearly doesn't want this one

    let match = 0;
    let topMood: string | null = null;
    let topValue = 0;
    for (const m of taste.moods) {
      const value = m.weight * (c.moods[m.slug] ?? 0);
      match += value;
      if (value > topValue) {
        topValue = value;
        topMood = m.slug;
      }
    }
    match /= totalWeight;

    const last = c.stats?.lastPlayedAt;
    pool.push({
      c,
      artistKey: c.artist.trim().toLowerCase(),
      match,
      tagged: Object.keys(c.moods).length > 0,
      daysSince: last ? Math.max(0, (now - last) / DAY_MS) : null,
      plays,
      skips,
      topMood,
    });
  }

  const size = Math.min(taste.size, pool.length);
  const counts = allocate(taste.mix, size);

  const report = {} as Record<Bucket, { requested: number; filled: number; backfilled: number }>;
  for (const b of BUCKETS) report[b] = { requested: counts[b], filled: 0, backfilled: 0 };

  const warnings: string[] = [];
  if (pool.length < taste.size) {
    warnings.push(`Only ${pool.length} eligible tracks, so the playlist has ${size} instead of ${taste.size}.`);
  }
  if (taste.moods.length === 0) {
    warnings.push("This taste has no moods, so mood-based buckets can't match anything.");
  }

  // 2. How each bucket ranks its candidates
  const isRecent = (s: Scored) => s.daysSince !== null && s.daysSince <= taste.recentDays;
  const moodOk = (s: Scored) => s.match >= taste.looseThreshold || !s.tagged;

  const rankers: Record<Bucket, () => Ranked[]> = {
    // Played lately, still fits the mood. More plays and fresher = higher.
    recent: () =>
      pool
        .filter(s => isRecent(s) && moodOk(s))
        .map(s => ({
          s,
          score:
            ((1 + Math.log1p(s.plays)) * (1 - s.daysSince! / (taste.recentDays + 1)) * (0.5 + s.match)) /
            (1 + s.skips) *
            jitter(),
        })),

    // Strong mood match, not already counted as "recent".
    exactMood: () =>
      pool
        .filter(s => s.match >= taste.exactThreshold && !isRecent(s))
        .map(s => ({ s, score: s.match * jitter() })),

    // Never heard (no completed or partial play, no skips), fits the mood.
    newMood: () =>
      pool
        .filter(s => s.daysSince === null && s.skips === 0 && s.match >= taste.looseThreshold)
        .map(s => ({ s, score: s.match * jitter() })),

    // Heard before, but long ago. Past favourites that went quiet rank higher.
    rediscover: () =>
      pool
        .filter(s => s.daysSince !== null && s.daysSince >= taste.rediscoverAfterDays && moodOk(s))
        .map(s => ({
          s,
          score:
            ((1 + Math.log1p(s.plays)) *
              Math.log1p(s.daysSince! / taste.rediscoverAfterDays) *
              (0.5 + s.match)) /
            (1 + s.skips) *
            jitter(),
        })),

    random: () => pool.map(s => ({ s, score: rand() })),
  };

  const explain = (bucket: Bucket, s: Scored, backfill: boolean): string => {
    const mood = s.topMood ? ` · ${s.topMood}` : "";
    if (backfill) return s.match >= taste.looseThreshold ? `Closest remaining match${mood}` : "Filler pick";
    switch (bucket) {
      case "recent":
        return `You played this ${Math.round(s.daysSince ?? 0)} days ago`;
      case "rediscover":
        return `Not played in ${Math.round(s.daysSince ?? 0)} days`;
      case "newMood":
        return `New to you${mood}`;
      case "exactMood":
        return `Strong match${mood} (${Math.round(s.match * 100)}%)`;
      default:
        return "Wildcard";
    }
  };

  // 3. Picking, with a per-artist cap for variety
  const chosen = new Set<string>();
  const artistCount = new Map<string, number>();
  const selection: GeneratedItem[] = [];

  const pick = (bucket: Bucket, ranked: Ranked[], n: number, relaxCap: boolean, backfill: boolean): number => {
    ranked.sort((a, b) => b.score - a.score);
    let got = 0;
    for (const { s, score } of ranked) {
      if (got >= n) break;
      if (chosen.has(s.c.trackId)) continue;
      if (!relaxCap && (artistCount.get(s.artistKey) ?? 0) >= taste.maxPerArtist) continue;

      chosen.add(s.c.trackId);
      artistCount.set(s.artistKey, (artistCount.get(s.artistKey) ?? 0) + 1);
      selection.push({
        trackId: s.c.trackId,
        bucket,
        score: round(score),
        ...(backfill ? { backfill: true } : {}),
        reason: explain(bucket, s, backfill),
        detail: {
          match: round(s.match, 2),
          topMood: s.topMood,
          daysSincePlayed: s.daysSince === null ? null : round(s.daysSince, 1),
          plays: s.plays,
        },
      });
      got++;
    }
    return got;
  };

  for (const bucket of FILL_ORDER) {
    if (counts[bucket] === 0) continue;
    report[bucket].filled = pick(bucket, rankers[bucket](), counts[bucket], false, false);
  }

  // 4. A bucket that ran short is topped up: best remaining mood matches first,
  //    then anything. The artist cap is relaxed only as a last resort.
  for (const relax of [false, true]) {
    if (selection.length >= size) break;

    const near = pool
      .filter(s => !chosen.has(s.c.trackId) && s.match >= taste.looseThreshold)
      .map(s => ({ s, score: s.match * jitter() }));
    report.exactMood.backfilled += pick("exactMood", near, size - selection.length, relax, true);
    if (selection.length >= size) break;

    const any = pool.filter(s => !chosen.has(s.c.trackId)).map(s => ({ s, score: rand() }));
    report.random.backfilled += pick("random", any, size - selection.length, relax, true);
  }

  for (const b of BUCKETS) {
    const r = report[b];
    if (r.filled < r.requested) {
      warnings.push(`Only found ${r.filled} of ${r.requested} "${b}" tracks, so other tracks filled in.`);
    }
  }

  // 5. Order: spread each bucket evenly through the playlist instead of
  //    playing them in blocks, then break up back-to-back tracks by one artist.
  const groups = new Map<Bucket, GeneratedItem[]>();
  for (const item of selection) {
    const list = groups.get(item.bucket);
    if (list) list.push(item);
    else groups.set(item.bucket, [item]);
  }
  const keyed: { item: GeneratedItem; key: number }[] = [];
  for (const list of groups.values()) {
    list.forEach((item, i) => keyed.push({ item, key: (i + rand()) / list.length }));
  }
  keyed.sort((a, b) => a.key - b.key);
  const ordered = keyed.map(k => k.item);

  const artistOf = new Map(pool.map(s => [s.c.trackId, s.artistKey]));
  for (let i = 1; i < ordered.length; i++) {
    const prev = artistOf.get(ordered[i - 1].trackId);
    if (artistOf.get(ordered[i].trackId) !== prev) continue;
    for (let j = i + 1; j < ordered.length; j++) {
      if (artistOf.get(ordered[j].trackId) !== prev) {
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
        break;
      }
    }
  }

  return { items: ordered, report, warnings, seed };
}