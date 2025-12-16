import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";

const MONGODB_URI = process.env.MONGODB_URI || "";

// Ensure mongoose is connected (same pattern as your Users API)
if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

/**
 * GET /api/tracks
 * Returns all tracks
 */
export async function GET() {
  try {
    const tracks = await Track.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Get tracks error:", error);

    return NextResponse.json(
      { message: "Failed to fetch tracks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracks
 * Creates a new track
 */
export async function POST(req: Request) {
  try {
    const { title, artist, url, image } = await req.json();

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
    });

    return NextResponse.json(track, { status: 201 });
  } catch (error) {
    console.error("Create track error:", error);

    return NextResponse.json(
      { message: "Failed to create track" },
      { status: 500 }
    );
  }
}
