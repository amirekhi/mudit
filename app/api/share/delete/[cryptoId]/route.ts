import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import clientPromise from "@/lib/mongo/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ cryptoId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { cryptoId } = await params;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const result = await db.collection("share_sessions").deleteOne({
    cryptoId,
    ownerId: new ObjectId(user._id),
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ message: "Not found or not yours" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted" });
}