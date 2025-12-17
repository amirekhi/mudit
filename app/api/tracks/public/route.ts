import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

/**
 * GET /api/tracks/public
 * Returns public tracks only
 */
export async function GET() {
  try {
    const tracks = await Track.find({
      visibility: "public",
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Get public tracks error:", error);

    return NextResponse.json(
      { message: "Failed to fetch public tracks" },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  const { title, artist, url, image } = await req.json();

  const track = await Track.create({
    title,
    artist,
    url,
    image,
    ownerId: null,
    visibility: "public",
  });

  return NextResponse.json(track, { status: 201 });
}