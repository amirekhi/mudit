
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";

// -------------------- GET Method --------------------

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const playlists = await db
      .collection("playlists")
      .find({})
      .toArray();

    if (!playlists.length) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // Collect unique valid ObjectIds
    const objectIds = [
      ...new Set(
        playlists
          .flatMap(p => p.trackIds ?? [])
          .filter(id => ObjectId.isValid(id))
      ),
    ].map(id => new ObjectId(id));

    const tracks = objectIds.length
      ? await db
          .collection("tracks")
          .find({ _id: { $in: objectIds } })
          .toArray()
      : [];

    const trackMap = new Map(
      tracks.map(t => [t._id.toString(), t])
    );

    const hydrated = playlists.map(p => ({
      ...p,
      tracks: (p.trackIds ?? []).map(
        (id: string) => trackMap.get(id) ?? null
      ),
    }));

    return new Response(JSON.stringify(hydrated), { status: 200 });
  } catch (err) {
    console.error("GET /playlists error:", err);
    return new Response(
      JSON.stringify({ message: "Failed to fetch playlists" }),
      { status: 500 }
    );
  }
}


// -------------------- POST Method --------------------



import { getCurrentUser } from "@/lib/auth/getCurrentUser";


export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, image, trackIds, visibility } = body;

  if (!title) {
    return Response.json({ message: "Title is required" }, { status: 400 });
  }

  if (!Array.isArray(trackIds)) {
    return Response.json({ message: "trackIds must be an array" }, { status: 400 });
  }

  const normalizedTrackIds = trackIds
    .map(String)
    .filter(id => ObjectId.isValid(id))
    .map(id => new ObjectId(id));

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const playlistDoc = {
    title,
    description: description || "",
    image: image || "",

    trackIds: normalizedTrackIds,

    ownerId: new ObjectId(user._id),
    visibility: visibility === "public" ? "public" : "private",

    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("playlists").insertOne(playlistDoc);

  const created = await db
    .collection("playlists")
    .findOne({ _id: result.insertedId });

  return Response.json(created, { status: 201 });
}


