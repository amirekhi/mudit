import { ObjectId, type Db, type Document } from "mongodb";
import { OWNER_FIELD } from "@/lib/auth/authz";
import { COLLECTIONS } from "./db";
import { RecError } from "./validate";

export type ListenOutcome = "skip" | "partial" | "listen";
export type ListenSourceKind = "home" | "playlist" | "search" | "recommendation" | "other";

export interface ListenInput {
  trackId: string;
  playedSeconds: number;
  durationSeconds?: number;
  source: { kind: ListenSourceKind; refId?: string };
  startedAt?: Date;
}

const SKIP_SECONDS = 10;   // stopped before this = a skip
const LISTEN_SECONDS = 30; // reached this = a real listen
const SOURCE_KINDS: ListenSourceKind[] = ["home", "playlist", "search", "recommendation", "other"];

/** Decided on the server so the UI and any agent can't disagree about it. */
export function classifyListen(playedSeconds: number, durationSeconds?: number): ListenOutcome {
  // Very short tracks (effects, jingles) scale the thresholds down.
  const skipLimit = durationSeconds ? Math.min(SKIP_SECONDS, durationSeconds * 0.25) : SKIP_SECONDS;
  const listenLimit = durationSeconds ? Math.min(LISTEN_SECONDS, durationSeconds * 0.5) : LISTEN_SECONDS;
  if (playedSeconds >= listenLimit) return "listen";
  if (playedSeconds < skipLimit) return "skip";
  return "partial";
}

export function parseListenInput(body: unknown): ListenInput {
  if (!body || typeof body !== "object") throw new RecError(400, "Invalid JSON body");
  const b = body as Record<string, unknown>;

  if (typeof b.trackId !== "string" || !/^[0-9a-f]{24}$/i.test(b.trackId)) {
    throw new RecError(400, "Invalid trackId");
  }
  if (typeof b.playedSeconds !== "number" || !Number.isFinite(b.playedSeconds) || b.playedSeconds < 0) {
    throw new RecError(400, "playedSeconds must be a positive number");
  }

  let durationSeconds: number | undefined;
  if (b.durationSeconds !== undefined && b.durationSeconds !== null) {
    if (typeof b.durationSeconds !== "number" || !Number.isFinite(b.durationSeconds) || b.durationSeconds < 0) {
      throw new RecError(400, "durationSeconds must be a positive number");
    }
    durationSeconds = b.durationSeconds > 0 ? Math.min(b.durationSeconds, 6 * 3600) : undefined;
  }

  // Can't have listened to more than the track holds (plus a little slack)
  const cap = durationSeconds ? Math.floor(durationSeconds * 1.1) : 6 * 3600;
  const playedSeconds = Math.min(b.playedSeconds, cap);

  const src = (b.source ?? {}) as { kind?: unknown; refId?: unknown };
  const kind = SOURCE_KINDS.includes(src.kind as ListenSourceKind) ? (src.kind as ListenSourceKind) : "other";
  const refId = typeof src.refId === "string" && src.refId.length <= 64 ? src.refId : undefined;

  // Trust the client's start time only if it's plausible
  let startedAt: Date | undefined;
  if (typeof b.startedAt === "string") {
    const d = new Date(b.startedAt);
    const now = Date.now();
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now + 5 * 60_000 && d.getTime() >= now - 2 * 86_400_000) {
      startedAt = d;
    }
  }

  return { trackId: b.trackId, playedSeconds, durationSeconds, source: { kind, ...(refId ? { refId } : {}) }, startedAt };
}

/**
 * Saves one play and updates the running totals for (user, track).
 * Only tracks the user may actually hear are accepted, so nobody can write
 * history against someone else's private track.
 */
export async function recordListen(db: Db, userId: string, input: ListenInput): Promise<{ outcome: ListenOutcome }> {
  const user = new ObjectId(userId);
  const track = new ObjectId(input.trackId);

  const allowed = await db
    .collection(COLLECTIONS.tracks)
    .findOne({ _id: track, $or: [{ [OWNER_FIELD]: user }, { visibility: "public" }] }, { projection: { _id: 1 } });
  if (!allowed) throw new RecError(404, "Track not found");

  const outcome = classifyListen(input.playedSeconds, input.durationSeconds);
  const at = input.startedAt ?? new Date();

  await db.collection(COLLECTIONS.listens).insertOne({
    userId: user,
    trackId: track,
    startedAt: at,
    playedSeconds: input.playedSeconds,
    ...(input.durationSeconds ? { durationSeconds: input.durationSeconds } : {}),
    outcome,
    source: input.source,
  });

  // A skip doesn't count as "heard recently", so it must not move lastPlayedAt;
  // otherwise skipping a track would make it look recently played.
  const update: Document = {
    $inc: {
      plays: outcome === "listen" ? 1 : 0,
      skips: outcome === "skip" ? 1 : 0,
      totalSeconds: input.playedSeconds,
    },
  };
  if (outcome !== "skip") {
    update.$min = { firstPlayedAt: at };
    update.$max = { lastPlayedAt: at };
  }
  await db.collection(COLLECTIONS.stats).updateOne({ userId: user, trackId: track }, update, { upsert: true });

  return { outcome };
}