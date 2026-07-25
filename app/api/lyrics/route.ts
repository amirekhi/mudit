import { NextRequest, NextResponse } from "next/server";

interface LrcLibResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

interface LyricsResponse {
  found: boolean;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
  source: "lrclib";
  matchedTrack?: string;
  matchedArtist?: string;
}

const NOT_FOUND: LyricsResponse = {
  found: false,
  instrumental: false,
  plainLyrics: null,
  syncedLyrics: null,
  source: "lrclib",
};

// Simple in-memory cache so repeated views of the same track don't keep
// hammering LRCLIB. Resets on server restart — good enough for a first pass.
// If you want this to survive restarts, store the result on the Track
// document in Mongo instead (see note at the bottom of the chat response).
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const cache = new Map<string, { data: LyricsResponse; expires: number }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track")?.trim();
  const artist = searchParams.get("artist")?.trim() ?? "";

  if (!track) {
    return NextResponse.json({ error: "Missing 'track' query param" }, { status: 400 });
  }

  const cacheKey = `${track.toLowerCase()}::${artist.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const params = new URLSearchParams({ track_name: track });
    if (artist) params.set("artist_name", artist);

    const res = await fetch(`https://lrclib.net/api/search?${params.toString()}`, {
      headers: {
        // LRCLIB asks integrations to identify themselves. This is safe to
        // send server-side (the CORS restriction only applies to browsers).
        "User-Agent": "MuditMusicApp/1.0 (https://my-music-app.com)",
      },
      // Cache the upstream fetch too — search results for a given track don't change.
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok) {
      cache.set(cacheKey, { data: NOT_FOUND, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(NOT_FOUND);
    }

    const results: LrcLibResult[] = await res.json();

    if (!Array.isArray(results) || results.length === 0) {
      cache.set(cacheKey, { data: NOT_FOUND, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(NOT_FOUND);
    }

    // Prefer a result with synced (timestamped) lyrics, then plain, then just take the first match.
    const best =
      results.find(r => r.syncedLyrics) ??
      results.find(r => r.plainLyrics) ??
      results[0];

    const data: LyricsResponse = {
      found: true,
      instrumental: best.instrumental,
      plainLyrics: best.plainLyrics,
      syncedLyrics: best.syncedLyrics,
      source: "lrclib",
      matchedTrack: best.trackName,
      matchedArtist: best.artistName,
    };

    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data);
  } catch (err) {
    console.error("LRCLIB lookup failed:", err);
    return NextResponse.json(NOT_FOUND);
  }
}