// app/api/telegram/effect/[id]/route.ts
//
// GET /api/telegram/effect/<shortId>
//
// Single-entry lookup used by the track detail page. Wraps findById and
// returns only client-safe fields — the raw Telegram file_id stays
// server-side, same as in the search route.

import { NextRequest, NextResponse } from "next/server";
import { findById } from "@/bot/store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const entry = await findById(id);
    if (!entry) {
      return NextResponse.json({ message: "Effect not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: entry.id,
      name: entry.name,
      artist: entry.artist,
      image: entry.thumbFileId ? `/api/telegram/thumb/${entry.id}` : undefined,
      addedAt: entry.addedAt,
    });
  } catch (error) {
    console.error("Effect lookup error:", error);
    return NextResponse.json(
      { message: "Failed to load effect" },
      { status: 500 }
    );
  }
}