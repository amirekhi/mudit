import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Artist from "@/models/Artist";
import Track from "@/models/Track";
import Playlist from "@/models/Playlists";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

/**
 * GET /api/artists/:slug
 * Returns an artist plus their public tracks and any public playlists
 * that contain one of those tracks.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const params = await context.params;

  try {
    const artist = await Artist.findOne({ slug: params.slug });
    if (!artist) {
      return NextResponse.json({ message: "Artist not found" }, { status: 404 });
    }

    const tracks = await Track.find({ artist: artist.name, visibility: "public" });
    const trackIds = tracks.map(t => t._id);

    const playlists = await Playlist.find({
      visibility: "public",
      trackIds: { $in: trackIds },
    });

    return NextResponse.json({ artist, tracks, playlists }, { status: 200 });
  } catch (error) {
    console.error("Fetch artist detail error:", error);
    return NextResponse.json(
      { message: "Failed to fetch artist" },
      { status: 500 }
    );
  }
}