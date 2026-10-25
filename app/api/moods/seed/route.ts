import { NextResponse } from "next/server";
import { requireUser, isAdmin, errorResponse } from "@/lib/auth/authz";
import { getDb, ensureRecIndexes, COLLECTIONS } from "@/lib/recs/db";
import { MOOD_SEED } from "@/lib/recs/moodSeed";
import { recFail } from "@/lib/recs/http";

/**
 * POST /api/moods/seed (admins only)
 * Adds any starter moods that don't exist yet. Safe to run repeatedly: it only
 * inserts, so moods you've edited or added yourself are never touched.
 */
export async function POST() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isAdmin(auth.user)) return errorResponse(404, "Not found");

    const db = await getDb();
    await ensureRecIndexes(db);

    const now = new Date();
    const result = await db.collection(COLLECTIONS.moods).bulkWrite(
      MOOD_SEED.map(m => ({
        updateOne: {
          filter: { slug: m.slug },
          update: { $setOnInsert: { ...m, isActive: true, createdAt: now, updatedAt: now } },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    return NextResponse.json({ added: result.upsertedCount, total: MOOD_SEED.length });
  } catch (err) {
    return recFail(err, "POST /moods/seed error:");
  }
}