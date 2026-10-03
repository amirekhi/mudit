import { ObjectId, type Db } from "mongodb";
import { OWNER_FIELD, errorResponse, type Visibility } from "@/lib/auth/authz";

/**
 * Checks the tracks a playlist is about to contain.
 *  - every track must exist and be the caller's own, or already public (404 otherwise, so other
 *    users' private tracks can't be probed or attached);
 *  - a public playlist may only hold public tracks (409), otherwise a private track would leak
 *    through the public playlist.
 * Returns an error response, or null when everything is fine.
 */
export async function checkPlaylistTracks(
  db: Db,
  owner: ObjectId,
  trackIds: string[],
  playlistVisibility: Visibility
) {
  if (trackIds.length === 0) return null;

  const tracks = await db
    .collection("tracks")
    .find(
      {
        _id: { $in: trackIds.map((id) => new ObjectId(id)) },
        $or: [{ [OWNER_FIELD]: owner }, { visibility: "public" }],
      },
      { projection: { _id: 1, visibility: 1 } }
    )
    .toArray();

  if (tracks.length !== trackIds.length) return errorResponse(404, "Track not found");

  if (playlistVisibility === "public" && tracks.some((t) => t.visibility !== "public")) {
    return errorResponse(409, "A public playlist can only contain public tracks");
  }
  return null;
}