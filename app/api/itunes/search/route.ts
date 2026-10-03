import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";

/**
 * GET /api/itunes/search?q=...
 * Proxies Apple's iTunes Search API for 30s preview MP3s. No API key required.
 * Now requires sign-in so it isn't an open proxy. If a public page needs it, delete the
 * requireUser lines (and add rate limiting instead).
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ message: "Unauthorized", tracks: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ tracks: [] });
  }
  if (q.length > 100) {
    return NextResponse.json({ message: "Query too long", tracks: [] }, { status: 400 });
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