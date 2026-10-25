import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { parseListenInput, recordListen } from "@/lib/recs/history";
import { actorFrom, recFail, readJson } from "@/lib/recs/http";

/**
 * POST /api/listens
 * Body: { trackId, playedSeconds, durationSeconds?, source?: { kind, refId? }, startedAt? }
 * Called by the player when a track ends or is left. The server decides
 * whether it counts as a skip, a partial listen or a real listen.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const input = parseListenInput(await readJson(req));
    const db = await getDb();
    await ensureRecIndexes(db);
    const { outcome } = await recordListen(db, actorFrom(auth.user).userId, input);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    return recFail(err, "POST /listens error:");
  }
}