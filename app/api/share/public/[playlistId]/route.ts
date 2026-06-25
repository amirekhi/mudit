import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  const { playlistId } = await params;

  if (!ObjectId.isValid(playlistId)) {
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const playlist = await db.collection("playlists").findOne({
    _id: new ObjectId(playlistId),
    visibility: "public",
  });

  if (!playlist) {
    return NextResponse.json({ message: "Playlist not found" }, { status: 404 });
  }

  const tracks = playlist.trackIds?.length
    ? await db
        .collection("tracks")
        .find({ _id: { $in: playlist.trackIds.map((id: any) => new ObjectId(id)) } })
        .toArray()
    : [];

  return NextResponse.json({
    playlist: {
      ...playlist,
      _id: playlist._id.toString(),
      tracks: tracks.map((t) => ({ ...t, _id: t._id.toString() })),
    },
  });
}