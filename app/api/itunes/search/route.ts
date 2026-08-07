import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/itunes/search?q=...
 * Proxies Apple's iTunes Search API for 30s preview MP3s.
 * No API key required. Kept server-side mainly for caching / consistent
 * shape with the rest of the app, not because of CORS (iTunes allows it).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        q
      )}&media=music&entity=song&limit=15`,
      { next: { revalidate: 3600 } } // cache identical queries for an hour
    );

    if (!res.ok) {
      throw new Error(`iTunes responded ${res.status}`);
    }

    const data = await res.json();

    const tracks = (data?.results ?? [])
      .filter((t: any) => !!t.previewUrl)
      .map((t: any) => ({
        itunesId: t.trackId,
        title: t.trackName,
        artist: t.artistName ?? "Unknown artist",
        image:
          // swap 100x100 thumb for a larger one when available
          (t.artworkUrl100 as string | undefined)?.replace(
            "100x100bb",
            "400x400bb"
          ) ?? t.artworkUrl60 ?? null,
        previewUrl: t.previewUrl as string, // ~30s m4a/mp3, hotlinkable
        duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : null,
      }));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("iTunes search error:", error);
    return NextResponse.json(
      { message: "Failed to search iTunes", tracks: [] },
      { status: 502 }
    );
  }
}