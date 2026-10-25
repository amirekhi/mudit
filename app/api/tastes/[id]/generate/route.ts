import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { generatePlaylistForTaste } from "@/lib/recs/service";
import { actorFrom, recFail, readJson } from "@/lib/recs/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/tastes/:id/generate   Body (optional): { seed?: string }
 * Builds the playlist and saves it as a private playlist owned by the caller.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    const body = (await readJson(req)) as { seed?: unknown } | null;
    const result = await generatePlaylistForTaste(db, actorFrom(auth.user), (await params).id, { seed: body?.seed });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return recFail(err, "POST /tastes/:id/generate error:");
  }
}