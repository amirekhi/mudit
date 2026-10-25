import { ObjectId, type Db, type Document } from "mongodb";
import { OWNER_FIELD } from "@/lib/auth/authz";
import { COLLECTIONS } from "./db";
import type { Candidate } from "./types";

const MOOD_MATCH_LIMIT = 3000; // tracks tagged with the taste's moods
const WILDCARD_SAMPLE = 300;   // random tracks, for the random and new buckets
const STATS_LIMIT = 5000;      // most recent history rows per user

/**
 * The pool the generator picks from: tracks this user may hear, with their
 * mood scores and their personal history. Built from three small queries
 * instead of loading the whole library:
 *   1. tracks tagged with the taste's moods
 *   2. tracks the user has a history with
 *   3. a random sample (for "random" and for discovering untagged tracks)
 */
export async function loadCandidates(db: Db, userId: string, moodSlugs: string[]): Promise<Candidate[]> {
  const owner = new ObjectId(userId);
  const accessible: Document = { $or: [{ [OWNER_FIELD]: owner }, { visibility: "public" }] };
  const projection = { artist: 1, moods: 1 };
  const tracks = db.collection(COLLECTIONS.tracks);

  const statsRows = await db
    .collection(COLLECTIONS.stats)
    .find({ userId: owner })
    .project({ trackId: 1, plays: 1, skips: 1, lastPlayedAt: 1 })
    .sort({ lastPlayedAt: -1 })
    .limit(STATS_LIMIT)
    .toArray();

  const stats = new Map<string, NonNullable<Candidate["stats"]>>();
  for (const r of statsRows) {
    stats.set(String(r.trackId), {
      plays: r.plays ?? 0,
      skips: r.skips ?? 0,
      lastPlayedAt: r.lastPlayedAt ? new Date(r.lastPlayedAt).getTime() : undefined,
    });
  }

  const [byMood, byHistory, sample] = await Promise.all([
    moodSlugs.length
      ? tracks.find({ ...accessible, "moods.slug": { $in: moodSlugs } }, { projection }).limit(MOOD_MATCH_LIMIT).toArray()
      : Promise.resolve([] as Document[]),
    statsRows.length
      ? tracks
          .find({ ...accessible, _id: { $in: statsRows.map(r => r.trackId as ObjectId) } }, { projection })
          .toArray()
      : Promise.resolve([] as Document[]),
    tracks
      .aggregate([{ $match: accessible }, { $sample: { size: WILDCARD_SAMPLE } }, { $project: projection }])
      .toArray(),
  ]);

  const byId = new Map<string, Candidate>();
  for (const t of [...byMood, ...byHistory, ...sample]) {
    const id = String(t._id);
    if (byId.has(id)) continue;
    const moods: Record<string, number> = {};
    for (const m of (t.moods ?? []) as { slug: string; score: number }[]) moods[m.slug] = m.score;
    byId.set(id, { trackId: id, artist: typeof t.artist === "string" ? t.artist : "", moods, stats: stats.get(id) });
  }
  return [...byId.values()];
}