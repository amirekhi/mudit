import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { errorResponse, parseObjectId, isTrustedUrl } from "@/lib/auth/authz";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

/**
 * GET /api/proxy/:id   (audio proxy)
 *
 * Before: any track, private ones included, could be streamed by anyone who had the id; the
 * stored url was fetched server-side without any check; and the whole file was loaded into memory.
 *
 * Now:
 *  - public tracks are open to everyone
 *  - private tracks only to their owner (404 for anyone else)
 *  - the source url must be https (and from MEDIA_ORIGIN when that is set)
 *  - the file is streamed, and Range requests are passed through so seeking works
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid track id");

    const track: any = await Track.findById(id).select("url visibility ownerId").lean();
    if (!track) return errorResponse(404, "Track not found");

    const isPublic = track.visibility === "public";
    if (!isPublic) {
      const user = await getCurrentUser();
      if (!user) return errorResponse(401, "Unauthorized");
      if (String(track.ownerId) !== String(user._id)) return errorResponse(404, "Track not found");
    }

    if (!isTrustedUrl(track.url)) return errorResponse(502, "Track source is not allowed");

    const headers: Record<string, string> = {};
    const range = req.headers.get("range");
    if (range) headers.Range = range;

    // redirect: "manual" so a stored url can't bounce the server to somewhere else
    const upstream = await fetch(track.url, { headers, redirect: "manual", cache: "no-store" });
    if ((upstream.status !== 200 && upstream.status !== 206) || !upstream.body) {
      return errorResponse(502, "Failed to fetch track");
    }

    const out = new Headers();
    const type = upstream.headers.get("content-type") ?? "";
    out.set("Content-Type", type.startsWith("audio/") ? type : "audio/mpeg");
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    if (!out.has("accept-ranges")) out.set("Accept-Ranges", "bytes");
    out.set("Cache-Control", isPublic ? "public, max-age=3600" : "private, max-age=3600");

    return new NextResponse(upstream.body, { status: upstream.status, headers: out });
  } catch (error) {
    console.error("Proxy error:", error);
    return errorResponse(500, "Failed to fetch track");
  }
}