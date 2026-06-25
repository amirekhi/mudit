import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import clientPromise from "@/lib/mongo/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { playlistId } = await params;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const sessions = await db
    .collection("share_sessions")
    .find({
      playlistId: new ObjectId(playlistId),
      ownerId: new ObjectId(user._id),
      expiresAt: { $gt: new Date() }, // only active ones
    })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(
    sessions.map((s) => ({
      cryptoId: s.cryptoId,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }))
  );
}