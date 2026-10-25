import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { listTastes, createTaste } from "@/lib/recs/service";
import { actorFrom, recFail, readJson } from "@/lib/recs/http";

/** GET /api/tastes: the signed-in user's tastes. */
export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    return NextResponse.json(await listTastes(db, actorFrom(auth.user)));
  } catch (err) {
    return recFail(err, "GET /tastes error:");
  }
}

/** POST /api/tastes: create a taste. Body: { name, moods: [{slug, weight?}], mix?, size?, schedule?, ... } */
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    const taste = await createTaste(db, actorFrom(auth.user), await readJson(req));
    return NextResponse.json(taste, { status: 201 });
  } catch (err) {
    return recFail(err, "POST /tastes error:");
  }
}