import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import clientPromise from "@/lib/mongo/mongodb";
import { ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

/**
 * PATCH /api/tracks/:id
 * Update track metadata
 */
export async function PATCH(
  req: Request,
  context :  { params: { id: string } }
) {

    const params = await context.params; // ✅ unwrap it
   const trackId = params.id;
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    
    const body = await req.json();

    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json(
        { message: "Track not found" },
        { status: 404 }
      );
    }

    const isOwner =
      track.ownerId?.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // ---- Allowed fields ----
    if (typeof body.title === "string") {
      track.title = body.title;
    }

    if (typeof body.artist === "string") {
      track.artist = body.artist;
    }

    if (typeof body.image === "string") {
      track.image = body.image;
    }

    // ---- Admin-only ----
    if (body.visibility !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { message: "Only admins can change visibility" },
          { status: 403 }
        );
      }

      if (body.visibility === "public" || body.visibility === "private") {
        track.visibility = body.visibility;
      }
    }

    await track.save();

    return NextResponse.json(track, { status: 200 });
  } catch (error) {
    console.error("Update track error:", error);

    return NextResponse.json(
      { message: "Failed to update track" },
      { status: 500 }
    );
  }
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

  const p = await params;
  const trackId = p.id;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);

  const track = await db.collection("tracks").findOne({
    _id: new ObjectId(trackId),
  });

  if (!track) {
    return NextResponse.json(
      { message: "Track not found" },
      { status: 404 }
    );
  }

  // 🚫 NEW RULE: public tracks cannot be deleted
  if (track.visibility === "public") {
    return NextResponse.json(
      { message: "Public tracks cannot be deleted" },
      { status: 403 }
    );
  }

  // ✅ Admin OR owner check
  if (
    track.ownerId.toString() !== user._id &&
    user.role !== "admin"
  ) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  await db.collection("tracks").deleteOne({
    _id: new ObjectId(trackId),
  });

  return NextResponse.json(
    { message: "Track deleted successfully" },
    { status: 200 }
  );
}
