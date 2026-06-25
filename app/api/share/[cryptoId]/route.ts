import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cryptoId: string }> }
) {
  const { cryptoId } = await params;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const session = await db.collection("share_sessions").findOne({ cryptoId });

  if (!session) {
    return NextResponse.json({ message: "Invalid or expired link" }, { status: 404 });
  }

  if (new Date() > new Date(session.expiresAt)) {
    return NextResponse.json({ message: "This link has expired" }, { status: 410 });
  }

  // Fetch the playlist with its tracks
  const playlist = await db.collection("playlists").findOne({
    _id: new ObjectId(session.playlistId),
  });

  if (!playlist) {
    return NextResponse.json({ message: "Playlist not found" }, { status: 404 });
  }

  // Fetch tracks
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
    expiresAt: session.expiresAt,
  });
}