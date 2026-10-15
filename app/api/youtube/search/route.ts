import { NextRequest, NextResponse } from "next/server";

// search.list costs 100 quota units and the default daily quota is 10,000,
// so only ~100 uncached lookups per day. Cache hard, and never cache errors.
const FOUND_TTL = 60 * 60 * 24 * 30; // 30 days
const MISS_TTL = 60 * 60 * 24;       // 1 day

// Best-effort per-instance cache (serverless instances come and go, so the
// CDN cache via Cache-Control below is the one that really counts).
const memory = new Map<string, string | null>();

export async function GET(req: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY is not set" }, { status: 500 });
  }

  const title = req.nextUrl.searchParams.get("title")?.trim();
  const artist = req.nextUrl.searchParams.get("artist")?.trim() ?? "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Normalised so "Artist - Song" and "artist  - song" share one cache entry.
  const q = `${artist} ${title} official video`.toLowerCase().replace(/\s+/g, " ").trim();

  const respond = (videoId: string | null) =>
    NextResponse.json(
      { videoId },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${videoId ? FOUND_TTL : MISS_TTL}, stale-while-revalidate=86400`,
        },
      }
    );

  if (memory.has(q)) return respond(memory.get(q) ?? null);

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true", // many official uploads block embedding; skip those
    videoCategoryId: "10",   // Music
    maxResults: "1",
    q,
    key,
  });

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      // Quota exceeded (403) etc. Don't cache, so it recovers when quota resets.
      return NextResponse.json(
        { videoId: null, error: `YouTube API ${res.status}` },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const data = await res.json();
    const videoId: string | null = data.items?.[0]?.id?.videoId ?? null;
    memory.set(q, videoId);
    return respond(videoId);
  } catch {
    return NextResponse.json(
      { videoId: null },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}