import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import clientPromise from "@/lib/mongo/mongodb";
import { ObjectId } from "mongodb";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: { playlistId: string; expiresInHours: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { playlistId, expiresInHours } = body;

  if (!playlistId || !expiresInHours || expiresInHours < 1) {
    return NextResponse.json({ message: "playlistId and expiresInHours are required" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  // Verify the playlist exists and belongs to this user
  const playlist = await db.collection("playlists").findOne({
    _id: new ObjectId(playlistId),
    ownerId: new ObjectId(user._id),
  });

  if (!playlist) {
    return NextResponse.json({ message: "Playlist not found" }, { status: 404 });
  }

  const cryptoId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await db.collection("share_sessions").insertOne({
    cryptoId,
    playlistId: new ObjectId(playlistId),
    ownerId: new ObjectId(user._id),
    expiresAt,
    createdAt: new Date(),
  });

  return NextResponse.json({ cryptoId, expiresAt });
}