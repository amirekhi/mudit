import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import Track from "@/models/Track";
import clientPromise from "@/lib/mongo/mongodb";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  requireUser,
  errorResponse,
  parseObjectId,
  cleanText,
  isTrustedUrl,
  resolveVisibility,
  OWNER_FIELD,
} from "@/lib/auth/authz";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/tracks/:id
 * Public tracks are readable by everyone. A private track is readable only by its owner;
 * anyone else gets 404, so nobody can tell whether it exists.
 * If you already had a GET here, keep yours as long as it applies the same rule.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid track id");

    const track: any = await Track.findById(id).lean();
    if (!track) return errorResponse(404, "Track not found");

    if (track.visibility !== "public") {
      const user = await getCurrentUser();
      if (!user || String(track.ownerId) !== String(user._id)) {
        return errorResponse(404, "Track not found");
      }
    }

    return NextResponse.json(track);
  } catch (error) {
    console.error("Get track error:", error);
    return errorResponse(500, "Failed to fetch track");
  }
}

/**
 * PATCH /api/tracks/:id
 * Owner only (someone else's track is "not found"). Only title, artist, image and visibility
 * can change, and only admins can make a track public.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid track id");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse(400, "Invalid request body");

    const existing: any = await Track.findOne({ _id: id, [OWNER_FIELD]: auth.user._id })
      .select("image visibility")
      .lean();
    if (!existing) return errorResponse(404, "Track not found");

    // Whitelist: the body is never spread into the update (ownerId must not be settable)
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = cleanText(body.title, 200);
      if (!title) return errorResponse(400, "Invalid title");
      updates.title = title;
    }
    if (body.artist !== undefined) {
      const artist = cleanText(body.artist, 200);
      if (!artist) return errorResponse(400, "Invalid artist");
      updates.artist = artist;
    }
    // An unchanged image is accepted as-is, so tracks with older image URLs can still be saved
    if (body.image !== undefined && body.image !== null && body.image !== "" && body.image !== existing.image) {
      if (!isTrustedUrl(body.image)) return errorResponse(400, "Invalid image url");
      updates.image = body.image;
    }

    // Visibility: sending the current value is a no-op; changing to public needs admin
    const currentVisibility = existing.visibility === "public" ? "public" : "private";
    if (body.visibility !== undefined && body.visibility !== currentVisibility) {
      const vis = resolveVisibility(auth.user, body.visibility);
      if (!vis.ok) return vis.response;

      if (vis.visibility === "private") {
        // A private track must not stay inside a public playlist (it would leak through it)
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB!);
        const inPublic = await db
          .collection("playlists")
          .findOne(
            { visibility: "public", trackIds: { $in: [new ObjectId(id), id] } },
            { projection: { _id: 1 } }
          );
        if (inPublic) {
          return errorResponse(409, "Remove this track from public playlists before making it private");
        }
      }
      updates.visibility = vis.visibility;
    }

    if (Object.keys(updates).length === 0) return NextResponse.json(existing);

    const track = await Track.findOneAndUpdate(
      { _id: id, [OWNER_FIELD]: auth.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!track) return errorResponse(404, "Track not found");

    return NextResponse.json(track);
  } catch (error) {
    console.error("Update track error:", error);
    return errorResponse(500, "Failed to update track");
  }
}

/**
 * DELETE /api/tracks/:id
 * Owner only. Also removes the track from every playlist, so nothing points at a missing track.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid track id");

    const deleted = await Track.findOneAndDelete({ _id: id, [OWNER_FIELD]: auth.user._id });
    if (!deleted) return errorResponse(404, "Track not found");

    // Matches both ObjectId and string entries (older addTrack calls stored strings)
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);
    await db
      .collection("playlists")
      .updateMany(
        { trackIds: { $in: [new ObjectId(id), id] } },
        { $pull: { trackIds: { $in: [new ObjectId(id), id] } } } as any
      );

    return NextResponse.json({ message: "Track deleted" });
  } catch (error) {
    console.error("Delete track error:", error);
    return errorResponse(500, "Failed to delete track");
  }
}