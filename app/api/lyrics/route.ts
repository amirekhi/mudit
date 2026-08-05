import { NextRequest, NextResponse } from "next/server";
import { searchLyrics } from "@/lib/lyrics/lrclib";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track")?.trim();
  const artist = searchParams.get("artist")?.trim() ?? "";

  if (!track) {
    return NextResponse.json({ error: "Missing 'track' query param" }, { status: 400 });
  }

  const result = await searchLyrics(track, artist);
  return NextResponse.json({ ...result, source: "lrclib" });
}