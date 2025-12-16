import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";

export async function PATCH(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const body = await req.json();
    const { trackId, playlistIds } = body;

    if (!trackId || !Array.isArray(playlistIds)) {
      return new Response(JSON.stringify({ message: "trackId and playlistIds are required" }), {
        status: 400,
      });
    }

    const validPlaylistIds = playlistIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

    // Update playlists: push trackId to trackIds array if not already present
    await db.collection("playlists").updateMany(
      { _id: { $in: validPlaylistIds } },
      { $addToSet: { trackIds: trackId } }
    );

    return new Response(JSON.stringify({ message: "Track added to playlists" }), { status: 200 });
  } catch (err) {
    console.error("PATCH /playlists/addTrack error:", err);
    return new Response(JSON.stringify({ message: "Failed to add track to playlists" }), { status: 500 });
  }
}
