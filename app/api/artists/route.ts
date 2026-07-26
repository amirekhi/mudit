import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Artist from "@/models/Artist";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

/**
 * GET /api/artists
 * List all synced artists, most-followed first.
 */
export async function GET() {
  try {
    const artists = await Artist.find({}).sort({ fanCount: -1 });
    return NextResponse.json(artists, { status: 200 });
  } catch (error) {
    console.error("Fetch artists error:", error);
    return NextResponse.json(
      { message: "Failed to fetch artists" },
      { status: 500 }
    );
  }
}