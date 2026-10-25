import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { quickMix } from "@/lib/recs/service";
import { actorFrom, recFail, readJson } from "@/lib/recs/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/tastes/:id/mix   Body: { period: "daily" | "weekly" | "monthly" }
 * Today's / this week's / this month's mix for a taste. Returns the playlist
 * to open. Asking again in the same period returns the same playlist at once.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    const body = (await readJson(req)) as { period?: unknown } | null;
    return NextResponse.json(await quickMix(db, actorFrom(auth.user), (await params).id, body?.period));
  } catch (err) {
    return recFail(err, "POST /tastes/:id/mix error:");
  }
}