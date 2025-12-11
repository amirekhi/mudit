import clientPromise from "@/lib/mongo/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  // 1️⃣ Fetch all playlists
  const playlists = await db.collection("playlists").find({}).toArray();

  if (!playlists.length) return Response.json([]);

  // 2️⃣ Collect all track ObjectIds from all playlists
  const allTrackIds = [
    ...new Set(playlists.flatMap(p => p.trackIds))
  ];

  // 3️⃣ Fetch all tracks by _id (ObjectId)
  const allTracks = await db
    .collection("songs")
    .find({ _id: { $in: allTrackIds } })
    .toArray();

  // 4️⃣ Build map for fast lookup
  const trackMap = new Map(allTracks.map(t => [t._id.toString(), t]));

  // 5️⃣ Hydrate playlists with tracks
  const hydrated = playlists.map(p => ({
    ...p,
    tracks: p.trackIds.map((id: { toString: () => string; }) => trackMap.get(id.toString()) || null)
  }));

  return Response.json(hydrated);
}
