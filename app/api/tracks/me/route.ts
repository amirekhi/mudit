import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";
import { requireUser, errorResponse, cleanText, isTrustedUrl, OWNER_FIELD } from "@/lib/auth/authz";

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
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const tracks = await Track.find({ [OWNER_FIELD]: auth.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Get user tracks error:", error);
    return errorResponse(500, "Failed to fetch user tracks");
  }
}

/**
 * POST /api/tracks/me
 * Creates a PRIVATE track for the logged-in user (publishing is admin-only and goes through
 * the track edit route). Fields are validated, and the owner comes from the session.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse(400, "Invalid request body");

    const title = cleanText(body.title, 200);
    const artist = cleanText(body.artist, 200);
    if (!title || !artist) return errorResponse(400, "title and artist are required");
    if (!isTrustedUrl(body.url)) return errorResponse(400, "A valid audio url is required");

    let image: string | undefined;
    if (body.image !== undefined && body.image !== null && body.image !== "") {
      if (!isTrustedUrl(body.image)) return errorResponse(400, "Invalid image url");
      image = body.image;
    }

    const track = await Track.create({
      title,
      artist,
      url: body.url,
      image,
      [OWNER_FIELD]: auth.user._id,
      visibility: "private",
    });

    return NextResponse.json(track, { status: 201 });
  } catch (error) {
    console.error("Create user track error:", error);
    return errorResponse(500, "Failed to create track");
  }
}
