import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";
import { hydratePlaylists } from "@/lib/playlists/hydratePlaylists";
import {
  requireUser,
  errorResponse,
  cleanText,
  optionalText,
  isTrustedUrl,
  parseIdList,
  resolveVisibility,
} from "@/lib/auth/authz";
import { checkPlaylistTracks } from "@/lib/auth/trackAccess";
import { parsePaging, pageResponse, escapeRegex, CI_COLLATION } from "@/lib/paging/server";

// Whitelisted sorts — the client's ?sort value is only ever looked up here.
const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  title: { title: 1, _id: 1 },
};

/**
 * GET /api/playlists
 * Public playlists only. The old version returned EVERY playlist, private ones included, with
 * their tracks, to anyone (no sign-in needed). Use /api/playlists/me for the caller's own.
 *
 *  - No query params  -> the full plain array, exactly as before.
 *  - ?page=&pageSize=[&q=][&sort=newest|title] -> one page:
 *    { items, total, page, pageSize, pageCount }. Only that page's playlists are
 *    hydrated, so their tracks aren't loaded for the whole collection.
 */
export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const paging = parsePaging(new URL(req.url).searchParams, { sorts: Object.keys(SORTS) });

    if (!paging) {
      const playlists = await db
        .collection("playlists")
        .find({ visibility: "public" })
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json(await hydratePlaylists(db, playlists));
    }

    const { page, pageSize, q, sort } = paging;

    const filter: Record<string, unknown> = { visibility: "public" };
    if (q) filter.title = { $regex: escapeRegex(q), $options: "i" };

    const cursor = db.collection("playlists").find(filter).sort(SORTS[sort]);
    if (sort !== "newest") cursor.collation(CI_COLLATION);

    const [playlists, total] = await Promise.all([
      cursor.skip((page - 1) * pageSize).limit(pageSize).toArray(),
      db.collection("playlists").countDocuments(filter),
    ]);

    const items = await hydratePlaylists(db, playlists);
    return NextResponse.json(pageResponse(items, total, { page, pageSize }));
  } catch (err) {
    console.error("GET /playlists error:", err);
    return errorResponse(500, "Failed to fetch playlists");
  }
}

/**
 * POST /api/playlists
 * Body: { title, description?, image?, trackIds?, visibility? }
 *  - public playlists: admins only (403 for everyone else)
 *  - tracks must be the caller's own or public; a public playlist holds only public tracks
 *  - the owner always comes from the session
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse(400, "Invalid JSON");

    const title = cleanText(body.title, 100);
    if (!title) return errorResponse(400, "Title is required");

    const description = optionalText(body.description, 500);
    if (description === null) return errorResponse(400, "Invalid description");

    let image = "";
    if (body.image !== undefined && body.image !== null && body.image !== "") {
      if (!isTrustedUrl(body.image)) return errorResponse(400, "Invalid image url");
      image = body.image;
    }

    const trackIds = parseIdList(body.trackIds ?? [], { min: 0 });
    if (!trackIds) return errorResponse(400, "trackIds must be an array of valid ids");

    const vis = resolveVisibility(auth.user, body.visibility);
    if (!vis.ok) return vis.response;

    const owner = new ObjectId(String(auth.user._id));
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const trackError = await checkPlaylistTracks(db, owner, trackIds, vis.visibility);
    if (trackError) return trackError;

    const now = new Date();
    const result = await db.collection("playlists").insertOne({
      title,
      description,
      image,
      trackIds: trackIds.map((id) => new ObjectId(id)),
      ownerId: owner,
      visibility: vis.visibility,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db.collection("playlists").findOne({ _id: result.insertedId });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /playlists error:", err);
    return errorResponse(500, "Failed to create playlist");
  }
}
