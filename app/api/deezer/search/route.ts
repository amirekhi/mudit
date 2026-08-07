import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/deezer/search?q=...
 * Proxies Deezer's public search API (browser can't call it directly — no CORS headers).
 * Returns a slim, front-end-friendly shape.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ tracks: [] });
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