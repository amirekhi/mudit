import type { Db } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";
import { OWNER_FIELD } from "@/lib/auth/authz";

export const COLLECTIONS = {
  tracks: "tracks",
  playlists: "playlists",
  moods: "moods",
  tastes: "tastes",
  listens: "listen_events",
  stats: "user_track_stats",
  signals: "track_mood_signals",
} as const;

// Same database your other routes use.
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB!);
}

// Native-driver routes don't get Mongoose's automatic indexes, so the
// recommendation collections create theirs here. createIndex does nothing if
// the index already exists, and this runs at most once per server instance.
let indexesReady: Promise<void> | null = null;

export function ensureRecIndexes(db: Db): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      await Promise.all([
        db.collection(COLLECTIONS.moods).createIndex({ slug: 1 }, { unique: true }),
        db.collection(COLLECTIONS.tastes).createIndex({ userId: 1, updatedAt: -1 }),
        db.collection(COLLECTIONS.tastes).createIndex({ isActive: 1, nextRunAt: 1 }),
        db.collection(COLLECTIONS.listens).createIndex({ userId: 1, startedAt: -1 }),
        db.collection(COLLECTIONS.listens).createIndex({ userId: 1, trackId: 1, startedAt: -1 }),
        db.collection(COLLECTIONS.stats).createIndex({ userId: 1, trackId: 1 }, { unique: true }),
        db.collection(COLLECTIONS.stats).createIndex({ userId: 1, lastPlayedAt: -1 }),
        db.collection(COLLECTIONS.tracks).createIndex({ "moods.slug": 1 }),
        db
          .collection(COLLECTIONS.signals)
          .createIndex({ trackId: 1, moodSlug: 1, source: 1, userId: 1 }, { unique: true }),
        db.collection(COLLECTIONS.signals).createIndex({ trackId: 1 }),
        // Finding a taste's mixes (today's, this week's...) and "made for you" on Home.
        db
          .collection(COLLECTIONS.playlists)
          .createIndex(
            { [OWNER_FIELD]: 1, "generated.generatedAt": -1 },
            { partialFilterExpression: { generated: { $exists: true } } }
          ),
      ]);
    })().catch(err => {
      indexesReady = null; // try again on the next request
      console.error("[recs] could not create indexes:", err);
    });
  }
  return indexesReady;
}