import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";

/**
 * GET /api/deezer/search?q=...
 * Proxies Deezer's public search API (browser can't call it directly: no CORS headers).
 * Now requires sign-in so it isn't an open proxy that burns your server's Deezer rate limit.
 * If a public page needs it, delete the requireUser lines (and add rate limiting instead).
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
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=15`,
      { next: { revalidate: 3600 } } // cache identical queries for an hour
    );

    if (!res.ok) {
      throw new Error(`Deezer responded ${res.status}`);
    }

    const data = await res.json();

    const tracks = (data?.data ?? [])
      .filter((t: any) => !!t.preview) // some results have no preview url
      .map((t: any) => ({
        deezerId: t.id,
        title: t.title,
        artist: t.artist?.name ?? "Unknown artist",
        image: t.album?.cover_medium ?? t.album?.cover ?? null,
        previewUrl: t.preview as string, // 30s mp3, hotlinkable
        duration: t.duration as number,
      }));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Deezer search error:", error);
    return NextResponse.json(
      { message: "Failed to search Deezer", tracks: [] },
      { status: 502 }
    );
  }
}