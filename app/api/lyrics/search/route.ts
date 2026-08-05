import { NextRequest, NextResponse } from "next/server";
import { searchLyricsList } from "@/lib/lyrics/lrclib";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const results = await searchLyricsList(q);
  return NextResponse.json({
    results: results.map(r => ({
      trackName: r.trackName,
      artistName: r.artistName,
      albumName: r.albumName,
    })),
  });
}