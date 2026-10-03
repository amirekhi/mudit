import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import clientPromise from "@/lib/mongo/mongodb";
import { requireUser, errorResponse, parseObjectId, OWNER_FIELD } from "@/lib/auth/authz";

const MAX_SHARE_HOURS = 24 * 365; // one year

/**
 * POST /api/share   Body: { playlistId, expiresInHours }
 * Creates a share link for one of the caller's own playlists.
 * Added: id validation (an invalid id used to throw a 500) and an upper bound on the expiry.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse(400, "Invalid JSON");

    const playlistId = parseObjectId(body.playlistId);
    const hours = Number(body.expiresInHours); // numeric strings from a <select> still work
    if (!playlistId || !Number.isFinite(hours) || hours < 1 || hours > MAX_SHARE_HOURS) {
      return errorResponse(400, `playlistId and expiresInHours (1 to ${MAX_SHARE_HOURS}) are required`);
    }

    const owner = new ObjectId(String(auth.user._id));
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    // The playlist must exist and belong to the caller
    const playlist = await db
      .collection("playlists")
      .findOne({ _id: new ObjectId(playlistId), [OWNER_FIELD]: owner }, { projection: { _id: 1 } });
    if (!playlist) return errorResponse(404, "Playlist not found");

    const cryptoId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    await db.collection("share_sessions").insertOne({
      cryptoId,
      playlistId: new ObjectId(playlistId),
      ownerId: owner,
      expiresAt,
      createdAt: new Date(),
    });

    return NextResponse.json({ cryptoId, expiresAt });
  } catch (err) {
    console.error("POST /share error:", err);
    return errorResponse(500, "Failed to create share link");
  }
}