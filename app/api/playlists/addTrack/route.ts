import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";

export async function PATCH(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const body = await req.json();
    const { trackIds, playlistIds } = body;

    // Validate input
    if (!Array.isArray(trackIds) || !trackIds.length || !Array.isArray(playlistIds) || !playlistIds.length) {
      return new Response(
        JSON.stringify({ message: "trackIds and playlistIds arrays are required" }),
        { status: 400 }
      );
    }

    // Validate playlist IDs
    const validPlaylistIds = playlistIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    if (!validPlaylistIds.length) {
      return new Response(
        JSON.stringify({ message: "No valid playlist IDs provided" }),
        { status: 400 }
      );
    }

    // Update playlists: push trackIds to trackIds array, avoid duplicates
    await db.collection("playlists").updateMany(
      { _id: { $in: validPlaylistIds } },
      { $addToSet: { trackIds: { $each: trackIds } } }
    );

    return new Response(JSON.stringify({ message: "Tracks added to playlists" }), { status: 200 });
  } catch (err) {
    console.error("PATCH /playlists/addTrack error:", err);
    return new Response(JSON.stringify({ message: "Failed to add tracks to playlists" }), { status: 500 });
  }
}
