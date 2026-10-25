import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { previewFromInput } from "@/lib/recs/service";
import { actorFrom, recFail, readJson } from "@/lib/recs/http";

/**
 * POST /api/tastes/preview
 * Body: the taste settings (same shape as creating one) plus an optional { seed }.
 * Shows what a playlist would be for settings that haven't been saved yet.
 * Saves nothing.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    const body = (await readJson(req)) as { seed?: unknown } | null;
    return NextResponse.json(await previewFromInput(db, actorFrom(auth.user), body, { seed: body?.seed }));
  } catch (err) {
    return recFail(err, "POST /tastes/preview error:");
  }
}