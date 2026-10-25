import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { previewPlaylist } from "@/lib/recs/service";
import { actorFrom, recFail, readJson } from "@/lib/recs/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/tastes/:id/preview   Body (optional): { seed?: string }
 * Shows what the playlist would be, with the reason for every track. Saves nothing.
 * Send the returned `seed` to /generate to get exactly this playlist.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    const body = (await readJson(req)) as { seed?: unknown } | null;
    return NextResponse.json(await previewPlaylist(db, actorFrom(auth.user), (await params).id, { seed: body?.seed }));
  } catch (err) {
    return recFail(err, "POST /tastes/:id/preview error:");
  }
}