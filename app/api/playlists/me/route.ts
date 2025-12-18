import clientPromise from "@/lib/mongo/mongodb";
import { hydratePlaylists } from "@/lib/playlists/hydratePlaylists";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { ObjectId } from "mongodb";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const playlists = await db
    .collection("playlists")
    .find({ ownerId: new ObjectId(user._id) })
    .sort({ createdAt: -1 })
    .toArray();

  const hydrated = await hydratePlaylists(db, playlists);

  return Response.json(hydrated);
}
