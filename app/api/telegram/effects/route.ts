// app/api/telegram/effects/route.ts
//
// GET /api/telegram/effects?q=airhorn&page=2&pageSize=24
//
// Paginated browse/search over the effect index. Returns one page of
// entries plus the total, so the client can render page numbers without
// ever loading the whole index. Like the search route, raw Telegram
// file_ids never leave the server.

import { NextRequest, NextResponse } from "next/server";
import { searchIndexPage } from "@/bot/store";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60; // hard cap so ?pageSize=100000 can't pull everything

function toPositiveInt(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q") ?? "";
  const page = toPositiveInt(params.get("page"), 1);
  const pageSize = Math.min(
    toPositiveInt(params.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );

  try {
    const { entries, total } = await searchIndexPage(q, page, pageSize);

    return NextResponse.json(
      {
        items: entries.map((m) => ({
          id: m.id,
          name: m.name,
          artist: m.artist,
          image: m.thumbFileId ? `/api/telegram/thumb/${m.id}` : undefined,
          addedAt: m.addedAt,
        })),
        total,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Effects page error:", error);
    return NextResponse.json(
      { message: "Failed to load effects" },
      { status: 500 }
    );
  }
}
