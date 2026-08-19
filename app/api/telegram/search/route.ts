// app/api/telegram/search/route.ts
//
// GET /api/telegram/search?q=airhorn
//
// Reads bot/index.json (kept up to date by the separate bot process,
// see bot/runBot.ts) and returns matching entries. This route never talks
// to Telegram directly — the index is just local JSON, so this is fast
// and doesn't burn Telegram API calls on every keystroke.

import { NextRequest, NextResponse } from "next/server";
import { searchIndex } from "@/bot/store";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  try {
    const matches = await searchIndex(q);

    // Intentionally only return `id`, `name`, and a derived `image` URL to
    // the client — raw Telegram file_ids stay server-side. `image` is only
    // included when a thumbnail actually exists, so the frontend's existing
    // `track.image || "/test.jpg"` fallback keeps working untouched.
    const results = matches.map((m) => ({
      id: m.id,
      name: m.name,
      artist: m.artist,
      image: m.thumbFileId ? `/api/telegram/thumb/${m.id}` : undefined,
    }));

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Effect search error:", error);
    return NextResponse.json(
      { message: "Failed to search effects" },
      { status: 500 }
    );
  }
}