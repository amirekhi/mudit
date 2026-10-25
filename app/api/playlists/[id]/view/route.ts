import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getDb } from "@/lib/recs/db";
import { getPlaylistView } from "@/lib/recs/playlistView";
import { recFail } from "@/lib/recs/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/playlists/:id/view
 * A playlist with its songs, in order, ready to display. Public playlists work
 * signed out; private ones only for their owner.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const db = await getDb();
    const view = await getPlaylistView(db, user ? String(user._id) : null, (await params).id);
    return NextResponse.json(view, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return recFail(err, "GET /playlists/:id/view error:");
  }
}