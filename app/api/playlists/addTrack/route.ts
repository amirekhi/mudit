import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";
import { requireUser, parseIdList, errorResponse, OWNER_FIELD, MAX_IDS } from "@/lib/auth/authz";

/**
 * PATCH /api/playlists/addTrack
 * Body: { trackIds: string[], playlistIds: string[] }
 *
 * Rules:
 *  - must be signed in
 *  - every target playlist must belong to the caller
 *  - every track must be the caller's own or already public
 *  - a public playlist can only receive public tracks
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    const trackIds = parseIdList(body?.trackIds);
    const playlistIds = parseIdList(body?.playlistIds);
    if (!trackIds || !playlistIds) {
      return errorResponse(
        400,
        `trackIds and playlistIds must be non-empty arrays of valid ids (max ${MAX_IDS} each)`
      );
    }

    const owner = new ObjectId(String(auth.user._id));
    const playlistOids = playlistIds.map((id) => new ObjectId(id));
    const trackOids = trackIds.map((id) => new ObjectId(id));

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    // 1) The caller must own every target playlist (404, so ids can't be probed)
    const playlists = await db
      .collection("playlists")
      .find({ _id: { $in: playlistOids }, [OWNER_FIELD]: owner }, { projection: { _id: 1, visibility: 1 } })
      .toArray();
    if (playlists.length !== playlistIds.length) {
      return errorResponse(404, "Playlist not found");
    }

    // 2) Every track must be the caller's own or public. Never someone else's private track.
    const tracks = await db
      .collection("tracks")
      .find(
        { _id: { $in: trackOids }, $or: [{ [OWNER_FIELD]: owner }, { visibility: "public" }] },
        { projection: { _id: 1, visibility: 1 } }
      )
      .toArray();
    if (tracks.length !== trackIds.length) {
      return errorResponse(404, "Track not found");
    }

    // 3) A public playlist must not expose private tracks
    const targetsPublic = playlists.some((p) => p.visibility === "public");
    if (targetsPublic && tracks.some((t) => t.visibility !== "public")) {
      return errorResponse(409, "A public playlist can only contain public tracks");
    }

    // The ownership filter is repeated in the write, so the check and the update can't drift apart.
    // trackIds are stored as strings, exactly as before this change.
    const result = await db
      .collection("playlists")
      .updateMany(
        { _id: { $in: playlistOids }, [OWNER_FIELD]: owner },
        { $addToSet: { trackIds: { $each: trackIds } } }
      );

    return NextResponse.json({ message: "Tracks added to playlists", modified: result.modifiedCount });
  } catch (err) {
    console.error("PATCH /playlists/addTrack error:", err);
    return errorResponse(500, "Failed to add tracks to playlists");
  }
}