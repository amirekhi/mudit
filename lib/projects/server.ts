import { NextResponse } from "next/server";
import { ObjectId, type Db } from "mongodb";
import { errorResponse, OWNER_FIELD } from "@/lib/auth/authz";
import { LIMITS, type SerializedProject } from "./projectTypes";
import { sourceTrackIdsOf } from "./validateProject";

/** Reads a JSON body but refuses anything larger than the limit (413) before parsing it. */
export async function readJsonLimited(
  req: Request,
  maxBytes: number = LIMITS.maxBodyBytes
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, response: errorResponse(413, "Request body too large") };
  }
  const text = await req.text();
  if (text.length > maxBytes) {
    return { ok: false, response: errorResponse(413, "Request body too large") };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: errorResponse(400, "Invalid JSON") };
  }
}

/**
 * A project may only point at tracks the caller can use: their own, or public ones.
 * Tracks that no longer exist are fine (the project then just has silent clips for them),
 * but someone else's PRIVATE track is refused, with the same 404 as everywhere else.
 */
export async function checkProjectSources(db: Db, owner: ObjectId, data: SerializedProject) {
  const ids = sourceTrackIdsOf(data);
  if (ids.length === 0) return null;

  const found = await db
    .collection("tracks")
    .find({ _id: { $in: ids.map((i) => new ObjectId(i)) } }, { projection: { _id: 1, [OWNER_FIELD]: 1, visibility: 1 } })
    .toArray();

  const blocked = found.some((t) => String(t[OWNER_FIELD]) !== String(owner) && t.visibility !== "public");
  return blocked ? errorResponse(404, "Track not found") : null;
}

/** Track metadata for a project's sources that the caller can access, plus the ids that are gone. */
export async function loadProjectTracks(db: Db, owner: ObjectId, ids: string[]) {
  if (ids.length === 0) return { tracks: [], missingTrackIds: [] as string[] };

  const docs = await db
    .collection("tracks")
    .find(
      { _id: { $in: ids.map((i) => new ObjectId(i)) }, $or: [{ [OWNER_FIELD]: owner }, { visibility: "public" }] },
      { projection: { title: 1, artist: 1, url: 1, image: 1, visibility: 1, createdAt: 1, updatedAt: 1 } }
    )
    .toArray();

  const tracks = docs.map((d) => ({
    _id: String(d._id),
    title: d.title,
    artist: d.artist,
    url: d.url,
    image: d.image,
    visibility: d.visibility,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  const have = new Set(tracks.map((t) => t._id));
  return { tracks, missingTrackIds: ids.filter((i) => !have.has(i)) };
}
