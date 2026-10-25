import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes } from "@/lib/recs/db";
import { getTaste, updateTaste, deleteTaste } from "@/lib/recs/service";
import { actorFrom, recFail, readJson } from "@/lib/recs/http";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/tastes/:id */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    return NextResponse.json(await getTaste(db, actorFrom(auth.user), (await params).id));
  } catch (err) {
    return recFail(err, "GET /tastes/:id error:");
  }
}

/** PATCH /api/tastes/:id: only the fields you send change. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await ensureRecIndexes(db);
    return NextResponse.json(await updateTaste(db, actorFrom(auth.user), (await params).id, await readJson(req)));
  } catch (err) {
    return recFail(err, "PATCH /tastes/:id error:");
  }
}

/** DELETE /api/tastes/:id: removes the taste, never the playlists it made. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const db = await getDb();
    await deleteTaste(db, actorFrom(auth.user), (await params).id);
    return NextResponse.json({ message: "Taste deleted" });
  } catch (err) {
    return recFail(err, "DELETE /tastes/:id error:");
  }
}