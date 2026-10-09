// app/api/telegram/search/route.ts
//
// GET /api/telegram/search?q=airhorn[&limit=6]
//
// Returns a plain array (shape unchanged, so existing callers keep working).
// With ?limit=N only the N newest matches are read from the index; without
// it, every match is returned as before. For browsing with page numbers use
// /api/telegram/effects instead.

import { NextRequest, NextResponse } from "next/server";
import { searchIndex, searchIndexPage } from "@/bot/store";

const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "", 10);

  try {
    const matches =
      Number.isFinite(limit) && limit > 0
        ? (await searchIndexPage(q, 1, Math.min(limit, MAX_LIMIT))).entries
        : await searchIndex(q);

    // Intentionally only return `id`, `name`, `artist`, a derived `image`
    // URL and `addedAt` to the client — raw Telegram file_ids stay
    // server-side. `image` is only included when a thumbnail actually
    // exists, so the frontend's `track.image || "/test.jpg"` fallback keeps
    // working untouched.
    const results = matches.map((m) => ({
      id: m.id,
      name: m.name,
      artist: m.artist,
      image: m.thumbFileId ? `/api/telegram/thumb/${m.id}` : undefined,
      addedAt: m.addedAt,
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
