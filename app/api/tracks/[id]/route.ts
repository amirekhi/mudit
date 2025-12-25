import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

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
