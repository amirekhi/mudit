import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { parsePaging, pageResponse, escapeRegex, CI_COLLATION } from "@/lib/paging/server";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

// Whitelisted sorts — the client's ?sort value is only ever looked up here,
// never passed to Mongo directly.
const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  title: { title: 1, _id: 1 },
  artist: { artist: 1, title: 1, _id: 1 },
};

/**
 * GET /api/tracks/public
 * Public tracks only.
 *
 *  - No query params  -> the full plain array, exactly as before (existing
 *    callers like fetchSongs keep working).
 *  - ?page=&pageSize=[&q=][&sort=newest|title|artist] -> one page:
 *    { items, total, page, pageSize, pageCount }
 */
export async function GET(req: Request) {
  try {
    const paging = parsePaging(new URL(req.url).searchParams, { sorts: Object.keys(SORTS) });

    if (!paging) {
      const tracks = await Track.find({ visibility: "public" })
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json(tracks);
    }

    const { page, pageSize, q, sort } = paging;

    const filter: Record<string, unknown> = { visibility: "public" };
    if (q) {
      const pattern = escapeRegex(q);
      filter.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { artist: { $regex: pattern, $options: "i" } },
      ];
    }

    const query = Track.find(filter).sort(SORTS[sort]);
    if (sort !== "newest") query.collation(CI_COLLATION);

    const [items, total] = await Promise.all([
      query.skip((page - 1) * pageSize).limit(pageSize).lean(),
      Track.countDocuments(filter),
    ]);

    return NextResponse.json(pageResponse(items, total, { page, pageSize }));
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
