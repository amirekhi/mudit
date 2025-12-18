import clientPromise from "@/lib/mongo/mongodb";
import { hydratePlaylists } from "@/lib/playlists/hydratePlaylists";

export async function GET() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const playlists = await db
    .collection("playlists")
    .find({ visibility: "public" })
    .sort({ createdAt: -1 })
    .toArray();

  const hydrated = await hydratePlaylists(db, playlists);

  return Response.json(hydrated);
}
