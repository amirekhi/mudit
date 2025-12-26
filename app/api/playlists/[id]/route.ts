import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo/mongodb";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { ObjectId } from "mongodb";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const p = await params;
  const playlistId = p.id;
  
  let data: {
    title?: string;
    description?: string;
    image?: string;
    trackIds?: string[];
    visibility?: "public" | "private";
  };

  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const playlist = await db.collection("playlists").findOne({
    _id: new ObjectId(playlistId),
    ownerId: new ObjectId(user._id),
  });

  if (!playlist) return NextResponse.json({ message: "Playlist not found" }, { status: 404 });

  const updateFields: any = {};
  if (data.title !== undefined) updateFields.title = data.title;
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.image !== undefined) updateFields.image = data.image;
  if (data.trackIds !== undefined)
    updateFields.trackIds = data.trackIds.map(id => new ObjectId(id));

  // Only admins can change visibility to public
  if (data.visibility !== undefined) {
    if (data.visibility === "public" && user.role !== "admin") {
      return NextResponse.json({ message: "Only admins can make a playlist public" }, { status: 403 });
    }
    updateFields.visibility = data.visibility;
  }

  updateFields.updatedAt = new Date();

  await db.collection("playlists").updateOne(
    { _id: new ObjectId(playlistId) },
    { $set: updateFields }
  );

  const updatedPlaylist = await db.collection("playlists").findOne({
    _id: new ObjectId(playlistId),
  });

  return NextResponse.json(updatedPlaylist);
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const p =  await params;
  const playlistId = p.id;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  // Only owner OR admin can delete
  const playlist = await db.collection("playlists").findOne({
    _id: new ObjectId(playlistId),
  });

  if (!playlist) {
    return NextResponse.json(
      { message: "Playlist not found" },
      { status: 404 }
    );
  }

  if (
    playlist.ownerId.toString() !== user._id &&
    user.role !== "admin"
  ) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  await db.collection("playlists").deleteOne({
    _id: new ObjectId(playlistId),
  });

  return NextResponse.json(
    { message: "Playlist deleted successfully" },
    { status: 200 }
  );
}
