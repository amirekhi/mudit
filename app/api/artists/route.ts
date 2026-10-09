import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Artist from "@/models/Artist";
import { parsePaging, pageResponse, escapeRegex, CI_COLLATION } from "@/lib/paging/server";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

// Whitelisted sorts — the client's ?sort value is only ever looked up here.
// "popular" is first, so it's the default (same order the list always had).
const SORTS: Record<string, Record<string, 1 | -1>> = {
  popular: { fanCount: -1, _id: -1 },
  name: { name: 1, _id: 1 },
};

/**
 * GET /api/artists
 * List synced artists, most-followed first.
 *
 *  - No query params  -> every artist as a plain array, exactly as before.
 *  - ?page=&pageSize=[&q=][&sort=popular|name] -> one page:
 *    { items, total, page, pageSize, pageCount }
 */
export async function GET(req: Request) {
  try {
    const paging = parsePaging(new URL(req.url).searchParams, { sorts: Object.keys(SORTS) });

    if (!paging) {
      const artists = await Artist.find({}).sort({ fanCount: -1 });
      return NextResponse.json(artists, { status: 200 });
    }

    const { page, pageSize, q, sort } = paging;

    const filter = q ? { name: { $regex: escapeRegex(q), $options: "i" } } : {};

    const query = Artist.find(filter).sort(SORTS[sort]);
    if (sort === "name") query.collation(CI_COLLATION);

    const [items, total] = await Promise.all([
      query.skip((page - 1) * pageSize).limit(pageSize).lean(),
      Artist.countDocuments(filter),
    ]);

    return NextResponse.json(pageResponse(items, total, { page, pageSize }), { status: 200 });
  } catch (error) {
    console.error("Fetch artists error:", error);
    return NextResponse.json(
      { message: "Failed to fetch artists" },
      { status: 500 }
    );
  }
}
