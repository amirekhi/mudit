import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";



const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

/**
 * GET /api/tracks/me
 * Returns tracks created by the logged-in user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const tracks = await Track.find({
      ownerId: user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Get user tracks error:", error);

    return NextResponse.json(
      { message: "Failed to fetch user tracks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracks/me
 * Creates a track for the logged-in user
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { title, artist, url, image, visibility } = await req.json();

    if (!title || !artist || !url) {
      return NextResponse.json(
        { message: "title, artist and url are required" },
        { status: 400 }
      );
    }

    const track = await Track.create({
      title,
      artist,
      url,
      image,
      ownerId: user._id,
      visibility: visibility ?? "private",
    });

    return NextResponse.json(track, { status: 201 });
  } catch (error) {
    console.error("Create user track error:", error);

    return NextResponse.json(
      { message: "Failed to create track" },
      { status: 500 }
    );
  }
}
