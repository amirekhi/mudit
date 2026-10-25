import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Collection, type Db } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

/**
 * GET /api/youtube/search?trackId=<id>&duration=<seconds>
 *
 * 1. Reads the track from MongoDB (title/artist come from the database, never
 *    from the URL, so this can't be used as a free general YouTube search).
 * 2. If the track already has a saved match, returns it. No YouTube call.
 * 3. Otherwise searches YouTube once, picks the best video, saves it on the
 *    track, and returns it. After that the track never costs quota again.
 *
 * Writes only ever $set the `youtube` field of one existing track. Nothing is
 * deleted, nothing is upserted, and `updatedAt` is not touched.
 */

const MISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // retry a stored "nothing found" after 30 days

// Candidates pulled per lookup. search.list costs 100 quota units no matter
// how many results it returns; the follow-up videos.list call costs 1.
const SEARCH_RESULTS = 8;

// The best candidate must reach this score, otherwise we report "no good
// video" and the client uses its fallback. Raise it to be pickier.
const MIN_SCORE = 45;

// Title words that usually mean "not the video we want". Ignored when the
// track's own title contains the word (e.g. a track literally called "... (Live)").
const BAD_PHRASES = [
  "cover", "reaction", "karaoke", "instrumental", "8d", "nightcore", "tutorial",
  "review", "mashup", "live", "remix", "slowed", "sped up", "reverb",
  "lyrics", "lyric", "official audio", "audio",
];

interface YoutubeCache {
  videoId: string | null;
  duration?: number;
  checkedAt?: Date;
  source?: "auto" | "manual";
  forTitle?: string;
  forArtist?: string;
}

interface TrackRow {
  _id: ObjectId;
  title: string;
  artist: string;
  visibility?: "public" | "private";
  ownerId?: ObjectId | null;
  youtube?: YoutubeCache;
}

interface Pick {
  videoId: string;
  duration: number; // seconds
  score: number;
}

interface VideoItem {
  id: string;
  snippet?: { title?: string; channelTitle?: string };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
}

class UpstreamError extends Error {
  constructor(public stage: "network" | "google", message: string, public status?: number) {
    super(message);
  }
}

// Two requests for the same track at once share one lookup (and one quota spend).
const inflight = new Map<string, Promise<Pick | null>>();

const ok = (body: Record<string, unknown>) =>
  NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=300" } });

const fail = (status: number, body: Record<string, unknown>) =>
  NextResponse.json({ videoId: null, ...body }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

// ───────────────────────── text helpers ─────────────────────────

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (s: string) => normalize(s).split(" ").filter(Boolean);

// "PT3M45S" -> 225
function parseDuration(iso?: string): number {
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d = "0", h = "0", min = "0", sec = "0"] = m;
  return Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(sec);
}

// "billie eilish - song (slowed + rain)" -> "song"
function cleanTitle(title: string, artist: string): string {
  let t = title.replace(/\(.*?\)|\[.*?\]/g, " ");
  const parts = t.split(/\s[-–—]\s/);
  if (parts.length > 1 && normalize(parts[0]) === normalize(artist)) {
    t = parts.slice(1).join(" ");
  }
  return t.replace(/\s+/g, " ").trim();
}

// ───────────────────────── YouTube ─────────────────────────

async function google(
  endpoint: "search" | "videos",
  params: Record<string, string>,
  key: string
) {
  const qs = new URLSearchParams({ ...params, key });
  let res: Response;
  try {
    res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    const cause = err instanceof Error ? (err.cause as { code?: string } | undefined)?.code : undefined;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[youtube] could not reach googleapis.com:", message, cause ?? "");
    throw new UpstreamError("network", `Could not reach googleapis.com: ${message}${cause ? ` (${cause})` : ""}`);
  }

  if (!res.ok) {
    let reason = "";
    try {
      const data = await res.json();
      reason = data?.error?.message ?? data?.error?.errors?.[0]?.reason ?? "";
    } catch {}
    console.error(`[youtube] Google API ${res.status}:`, reason);
    throw new UpstreamError("google", `YouTube API ${res.status}: ${reason}`, res.status);
  }

  return res.json();
}

interface Context {
  artist: string;
  cleaned: string;
  original: string;
  trackDuration: number;
}

function scoreVideo(v: VideoItem, ctx: Context) {
  const rawTitle = v.snippet?.title ?? "";
  const title = normalize(rawTitle);
  const channel = normalize(v.snippet?.channelTitle ?? "");
  const titleTokens = new Set(tokens(rawTitle));
  const channelTokens = tokens(v.snippet?.channelTitle ?? "");
  const duration = parseDuration(v.contentDetails?.duration);

  let s = 0;

  // Does the title match the song? (up to 40)
  const wantTitle = tokens(ctx.cleaned);
  if (wantTitle.length) {
    s += 40 * (wantTitle.filter(t => titleTokens.has(t)).length / wantTitle.length);
  }

  // Does title/channel match the artist? (up to 20)
  const wantArtist = tokens(ctx.artist);
  if (wantArtist.length) {
    const pool = new Set([...titleTokens, ...channelTokens]);
    s += 20 * (wantArtist.filter(t => pool.has(t)).length / wantArtist.length);
  }

  // Official channel (artist's own channel or VEVO)
  const artistCompact = normalize(ctx.artist).replace(/ /g, "");
  const channelCompact = channel.replace(/ /g, "");
  if ((artistCompact && channelCompact.includes(artistCompact)) || channelCompact.endsWith("vevo")) s += 15;

  // Auto-generated "Topic" channels are a static album cover: bad background.
  if (channel.endsWith(" topic")) s -= 25;

  if (/\bofficial (music )?video\b/.test(title)) s += 10;

  // Penalise words that suggest a different kind of video
  const padded = ` ${title} `;
  const originalPadded = ` ${normalize(ctx.original)} `;
  for (const bad of BAD_PHRASES) {
    const needle = ` ${bad} `;
    if (padded.includes(needle) && !originalPadded.includes(needle)) s -= 30;
  }

  // Popularity (up to 20 for views, 5 for like ratio)
  const views = Number(v.statistics?.viewCount ?? 0);
  const likes = Number(v.statistics?.likeCount ?? 0);
  s += Math.min(20, Math.log10(views + 1) * 2.4);
  if (views > 0 && likes > 0) s += Math.min(5, (likes / views) * 100);

  // Same recording? Compare against the length of the audio we're playing.
  if (ctx.trackDuration > 0 && duration > 0) {
    const diff = Math.abs(duration - ctx.trackDuration);
    if (diff <= 3) s += 25;
    else if (diff <= 8) s += 10;
    else if (diff / ctx.trackDuration > 0.15) s -= 25;
  }

  return { score: s, duration };
}

// Search (100 units) + stats for all candidates (1 unit), ranked best-first.
async function rank(row: TrackRow, trackDuration: number, key: string) {
  const cleaned = cleanTitle(row.title, row.artist);
  const q = `${row.artist} ${cleaned} official video`.toLowerCase().replace(/\s+/g, " ").trim();

  const search = await google("search", {
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    videoCategoryId: "10", // Music
    maxResults: String(SEARCH_RESULTS),
    q,
  }, key);

  const ids: string[] = (search.items ?? [])
    .map((i: { id?: { videoId?: string } }) => i.id?.videoId)
    .filter(Boolean);

  if (!ids.length) return { q, ranked: [] as { v: VideoItem; score: number; duration: number }[] };

  const details = await google("videos", {
    part: "snippet,contentDetails,statistics,status",
    id: ids.join(","),
  }, key);

  const ctx: Context = { artist: row.artist, cleaned, original: row.title, trackDuration };

  const ranked = ((details.items ?? []) as VideoItem[])
    .filter(v => v.status?.embeddable !== false && v.status?.privacyStatus === "public")
    .map(v => ({ v, ...scoreVideo(v, ctx) }))
    .sort((a, b) => b.score - a.score);

  return { q, ranked };
}

// Search, pick, and save the answer on the track.
async function lookup(
  tracks: Collection<TrackRow>,
  row: TrackRow,
  trackDuration: number,
  key: string
): Promise<Pick | null> {
  const { ranked } = await rank(row, trackDuration, key);
  const best = ranked[0];
  const pick: Pick | null =
    best && best.score >= MIN_SCORE
      ? { videoId: best.v.id, duration: best.duration, score: best.score }
      : null;

  // Save a hit always. Save "nothing found" only when we knew the audio's
  // length, because without it the scoring is weaker and a retry might succeed.
  if (pick || trackDuration > 0) {
    const youtube: YoutubeCache = {
      videoId: pick?.videoId ?? null,
      checkedAt: new Date(),
      source: "auto",
      forTitle: row.title,
      forArtist: row.artist,
    };
    if (pick) youtube.duration = pick.duration;

    try {
      // The filter skips tracks with a manual pick. Matches one existing
      // document only (no upsert), and only sets the `youtube` field.
      await tracks.updateOne(
        { _id: row._id, "youtube.source": { $ne: "manual" } },
        { $set: { youtube } }
      );
    } catch (err) {
      console.error("[youtube] could not save the match on the track:", err);
    }
  }

  return pick;
}

// ───────────────────────── access ─────────────────────────

async function currentUserId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user ? String(user._id) : null;
  } catch {
    return null;
  }
}

// ───────────────────────── handler ─────────────────────────

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const trackId = sp.get("trackId") ?? "";
  const trackDuration = Math.max(0, Math.round(Number(sp.get("duration")) || 0));
  // Dev-only: ranked candidates with scores, nothing saved. Add &debug=1
  const debug = sp.get("debug") === "1" && process.env.NODE_ENV !== "production";

  // Only tracks stored in our database can have a video (not Telegram effects etc.).
  if (!/^[0-9a-f]{24}$/i.test(trackId)) return ok({ videoId: null });

  let db: Db;
  try {
    db = (await clientPromise).db(process.env.MONGODB_DB!);
  } catch (err) {
    console.error("[youtube] database connection failed:", err);
    return fail(500, { stage: "db", error: "Database connection failed" });
  }

  const tracks = db.collection<TrackRow>("tracks");

  let row: TrackRow | null;
  try {
    row = await tracks.findOne(
      { _id: new ObjectId(trackId) },
      { projection: { title: 1, artist: 1, visibility: 1, ownerId: 1, youtube: 1 } }
    );
  } catch (err) {
    console.error("[youtube] database read failed:", err);
    return fail(500, { stage: "db", error: "Database read failed" });
  }

  if (!row) {
    // If every track hits this, the connection string points at a different
    // database than Mongoose uses (see the note in the setup steps).
    console.warn("[youtube] track not found in this database:", trackId);
    return fail(404, { stage: "not-found", error: "Track not found" });
  }

  // Private tracks only for their owner. Same answer as "not found" otherwise.
  if ((row.visibility ?? "public") === "private") {
    const me = await currentUserId();
    if (!me || String(row.ownerId ?? "") !== me) {
      return fail(404, { stage: "not-found", error: "Track not found" });
    }
  }

  // Saved match? A match only counts for the title/artist it was found for,
  // so a renamed track is looked up again. Manual picks always stand.
  const y = row.youtube;
  const fresh = !!y && (y.source === "manual" || (y.forTitle === row.title && y.forArtist === row.artist));
  if (!debug && y && fresh) {
    if (y.videoId) return ok({ videoId: y.videoId, duration: y.duration ?? 0 });
    const age = y.checkedAt ? Date.now() - new Date(y.checkedAt).getTime() : Infinity;
    if (age < MISS_TTL_MS) return ok({ videoId: null });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error("[youtube] YOUTUBE_API_KEY is not set");
    return fail(500, { stage: "config", error: "YOUTUBE_API_KEY is not set" });
  }

  try {
    if (debug) {
      const { q, ranked } = await rank(row, trackDuration, key);
      return NextResponse.json({
        q,
        trackDuration,
        minScore: MIN_SCORE,
        candidates: ranked.map(r => ({
          videoId: r.v.id,
          title: r.v.snippet?.title,
          channel: r.v.snippet?.channelTitle,
          views: Number(r.v.statistics?.viewCount ?? 0),
          duration: r.duration,
          score: Math.round(r.score * 10) / 10,
        })),
      });
    }

    let work = inflight.get(trackId);
    if (!work) {
      work = lookup(tracks, row, trackDuration, key).finally(() => inflight.delete(trackId));
      inflight.set(trackId, work);
    }
    const pick = await work;

    return ok(pick
      ? { videoId: pick.videoId, duration: pick.duration, score: Math.round(pick.score) }
      : { videoId: null });
  } catch (err) {
    if (err instanceof UpstreamError) {
      return fail(502, { stage: err.stage, status: err.status, error: err.message });
    }
    console.error("[youtube] unexpected error:", err);
    return fail(500, { stage: "unknown", error: "Unexpected error" });
  }
}