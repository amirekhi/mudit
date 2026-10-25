import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { getHomeForYou } from "@/lib/recs/home";
import { actorFrom, recFail } from "@/lib/recs/http";

/**
 * GET /api/home/for-you
 * The signed-in user's personal Home sections: playlists made from their
 * tastes, a blend of songs from them, and what they listened to recently.
 */
export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    return NextResponse.json(await getHomeForYou(db, actorFrom(auth.user)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return recFail(err, "GET /home/for-you error:");
  }
}