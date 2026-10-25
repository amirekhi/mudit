import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { listMoods } from "@/lib/recs/service";
import { recFail } from "@/lib/recs/http";

/** GET /api/moods: the mood vocabulary tastes and tracks use. */
export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    return NextResponse.json(await listMoods(db), { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    return recFail(err, "GET /moods error:");
  }
}