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
  const currentUser = await getCurrentUser();
  console.log("Current User in POST /api/tracks/me:", currentUser);
  
    if (!currentUser) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }


  const { title, artist, url, image, visibility } = await req.json();

  // Determine if user is admin
  const isAdmin = currentUser?.role === "admin";
  console.log("isAdmin:", isAdmin);
  console.log("Requested visibility:", visibility);

  // Determine final visibility
  const finalVisibility =
    isAdmin && (visibility === "public" || visibility === "private")
      ? visibility
      : "private";

  // Create track
  const track = await Track.create({
    title,
    artist,
    url,
    image,
    ownerId: currentUser?._id ?? null,
    visibility: finalVisibility,
  });

  return NextResponse.json(track, { status: 201 });
}

