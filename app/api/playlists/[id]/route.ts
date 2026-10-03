import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";
import {
  requireUser,
  errorResponse,
  parseObjectId,
  parseIdList,
  cleanText,
  optionalText,
  isTrustedUrl,
  resolveVisibility,
  isAdmin,
  OWNER_FIELD,
  type Visibility,
} from "@/lib/auth/authz";
import { checkPlaylistTracks } from "@/lib/auth/trackAccess";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/playlists/:id
 * Only the owner can edit (someone else's playlist is "not found").
 * Only whitelisted fields are written. Tracks must be the owner's own or public, and a public
 * playlist holds only public tracks. Only admins can make a playlist public.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid playlist id");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse(400, "Invalid JSON");

    const owner = new ObjectId(String(auth.user._id));
    const oid = new ObjectId(id);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const existing = await db.collection("playlists").findOne({ _id: oid, [OWNER_FIELD]: owner });
    if (!existing) return errorResponse(404, "Playlist not found");

    const set: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = cleanText(body.title, 100);
      if (!title) return errorResponse(400, "Invalid title");
      set.title = title;
    }

    if (body.description !== undefined) {
      const description = optionalText(body.description, 500);
      if (description === null) return errorResponse(400, "Invalid description");
      set.description = description;
    }

    // An unchanged image is accepted as-is, so playlists with older image URLs can still be saved
    if (body.image !== undefined && body.image !== null && body.image !== existing.image) {
      if (body.image !== "" && !isTrustedUrl(body.image)) return errorResponse(400, "Invalid image url");
      set.image = body.image;
    }

    // Visibility: sending the current value is a no-op. Changing to public needs admin.
    const currentVisibility: Visibility = existing.visibility === "public" ? "public" : "private";
    let nextVisibility: Visibility = currentVisibility;
    if (body.visibility !== undefined && body.visibility !== currentVisibility) {
      const vis = resolveVisibility(auth.user, body.visibility);
      if (!vis.ok) return vis.response;
      nextVisibility = vis.visibility;
      set.visibility = nextVisibility;
    }

    let nextTrackIds: string[] = (existing.trackIds ?? []).map(String);
    if (body.trackIds !== undefined) {
      const parsed = parseIdList(body.trackIds, { min: 0 });
      if (!parsed) return errorResponse(400, "trackIds must be an array of valid ids");
      nextTrackIds = parsed;
      set.trackIds = parsed.map((t) => new ObjectId(t));
    }

    if (set.trackIds !== undefined || set.visibility !== undefined) {
      const trackError = await checkPlaylistTracks(db, owner, nextTrackIds, nextVisibility);
      if (trackError) return trackError;
    }

    set.updatedAt = new Date();

    await db.collection("playlists").updateOne({ _id: oid, [OWNER_FIELD]: owner }, { $set: set });

    const updated = await db.collection("playlists").findOne({ _id: oid });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /playlists/:id error:", err);
    return errorResponse(500, "Failed to update playlist");
  }
}

/**
 * DELETE /api/playlists/:id
 * The owner can delete. Admins can also delete any playlist (existing moderation behaviour).
 *
 * Bug fixed here: the old check compared a string with an ObjectId (`!== user._id`), which is
 * always "different" now that getCurrentUser() returns a Mongoose document, so owners were
 * refused and only admins could delete.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid playlist id");

    const oid = new ObjectId(id);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const playlist = await db.collection("playlists").findOne({ _id: oid }, { projection: { [OWNER_FIELD]: 1 } });
    if (!playlist) return errorResponse(404, "Playlist not found");

    const isOwner = String(playlist[OWNER_FIELD]) === String(auth.user._id);
    if (!isOwner && !isAdmin(auth.user)) {
      return errorResponse(404, "Playlist not found"); // don't reveal that it exists
    }

    await db.collection("playlists").deleteOne({ _id: oid });
    await db.collection("share_sessions").deleteMany({ playlistId: oid }); // revoke its share links

    return NextResponse.json({ message: "Playlist deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE /playlists/:id error:", err);
    return errorResponse(500, "Failed to delete playlist");
  }
}