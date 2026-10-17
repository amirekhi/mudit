import { NextRequest, NextResponse } from "next/server";

const FOUND_TTL = 60 * 60 * 24 * 30; // 30 days
const MISS_TTL = 60 * 60 * 24;       // 1 day

// Candidates pulled per lookup. search.list costs 100 quota units no matter
// how many results it returns; the follow-up videos.list call costs 1.
// So a lookup is ~101 units: roughly 99 uncached lookups per day by default.
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

// Best-effort per-instance cache; the CDN cache (Cache-Control) is what counts.
const memory = new Map<string, Pick | null>();

class UpstreamError extends Error {
  constructor(public stage: "network" | "google", message: string, public status?: number) {
    super(message);
  }
}

const fail = (status: number, body: Record<string, unknown>) =>
  NextResponse.json({ videoId: null, ...body }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

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

export async function GET(req: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error("[youtube] YOUTUBE_API_KEY is not set");
    return fail(500, { error: "YOUTUBE_API_KEY is not set", stage: "config" });
  }

  const sp = req.nextUrl.searchParams;
  const title = sp.get("title")?.trim();
  const artist = sp.get("artist")?.trim() ?? "";
  const trackDuration = Math.max(0, Math.round(Number(sp.get("duration")) || 0));
  // Dev-only: ranked candidates with scores, for tuning. Add &debug=1
  const debug = sp.get("debug") === "1" && process.env.NODE_ENV !== "production";

  if (!title) return fail(400, { error: "title is required", stage: "input" });

  const cleaned = cleanTitle(title, artist);
  const q = `${artist} ${cleaned} official video`.toLowerCase().replace(/\s+/g, " ").trim();
  const cacheKey = `${q}|${trackDuration}`;

  const respond = (pick: Pick | null) =>
    NextResponse.json(
      pick
        ? { videoId: pick.videoId, duration: pick.duration, score: Math.round(pick.score) }
        : { videoId: null },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${pick ? FOUND_TTL : MISS_TTL}, stale-while-revalidate=86400`,
        },
      }
    );

  if (!debug && memory.has(cacheKey)) return respond(memory.get(cacheKey) ?? null);

  try {
    // 1) Candidates (100 units)
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

    if (!ids.length) {
      memory.set(cacheKey, null);
      return debug ? NextResponse.json({ q, candidates: [] }) : respond(null);
    }

    // 2) Stats, duration and embed status for all candidates in one call (1 unit)
    const details = await google("videos", {
      part: "snippet,contentDetails,statistics,status",
      id: ids.join(","),
    }, key);

    const ctx: Context = { artist, cleaned, original: title, trackDuration };

    const ranked = ((details.items ?? []) as VideoItem[])
      .filter(v => v.status?.embeddable !== false && v.status?.privacyStatus === "public")
      .map(v => ({ v, ...scoreVideo(v, ctx) }))
      .sort((a, b) => b.score - a.score);

    if (debug) {
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

    const best = ranked[0];
    const pick: Pick | null =
      best && best.score >= MIN_SCORE
        ? { videoId: best.v.id, duration: best.duration, score: best.score }
        : null;

    memory.set(cacheKey, pick);
    return respond(pick);
  } catch (err) {
    if (err instanceof UpstreamError) {
      return fail(502, { stage: err.stage, status: err.status, error: err.message });
    }
    console.error("[youtube] unexpected error:", err);
    return fail(500, { stage: "unknown", error: "Unexpected error" });
  }
}