import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";
import { requireUser, errorResponse, parseObjectId, cleanText, OWNER_FIELD } from "@/lib/auth/authz";
import { sourceTrackIdsOf, validateProjectData } from "@/lib/projects/validateProject";
import { checkProjectSources, loadProjectTracks, readJsonLimited } from "@/lib/projects/server";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/projects/:id
 * Owner only (someone else's project is "not found"). Also returns the metadata of the tracks
 * the project uses, so the editor can decode them, and the ids of tracks that no longer exist.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid project id");

    const owner = new ObjectId(String(auth.user._id));
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const project = await db.collection("projects").findOne({ _id: new ObjectId(id), [OWNER_FIELD]: owner });
    if (!project) return errorResponse(404, "Project not found");

    // Re-validate what comes out too: a document edited by hand can't feed bad data to the editor
    const data = validateProjectData(project.data);
    if (!data.ok) return errorResponse(422, "This project's data is invalid and can't be opened");

    const { tracks, missingTrackIds } = await loadProjectTracks(db, owner, sourceTrackIdsOf(data.value));

    return NextResponse.json({
      project: {
        _id: String(project._id),
        name: project.name,
        rev: project.rev,
        data: data.value,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      tracks,
      missingTrackIds,
    });
  } catch (err) {
    console.error("GET /projects/:id error:", err);
    return errorResponse(500, "Failed to load project");
  }
}

/**
 * PUT /api/projects/:id   Body: { name?, data?, baseRev }
 * Owner only. `baseRev` is the revision the client last saw. If the project has been saved from
 * somewhere else since, the update is refused with 409 instead of silently overwriting it.
 */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid project id");

    const parsed = await readJsonLimited(req);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body as { name?: unknown; data?: unknown; baseRev?: unknown } | null;
    if (!body || typeof body !== "object") return errorResponse(400, "Invalid request body");

    const baseRev = body.baseRev;
    if (typeof baseRev !== "number" || !Number.isInteger(baseRev) || baseRev < 1) {
      return errorResponse(400, "baseRev is required");
    }

    const owner = new ObjectId(String(auth.user._id));
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const set: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = cleanText(body.name, 100);
      if (!name) return errorResponse(400, "Invalid project name");
      set.name = name;
    }

    if (body.data !== undefined) {
      const data = validateProjectData(body.data);
      if (!data.ok) return errorResponse(400, data.error);
      const sourceError = await checkProjectSources(db, owner, data.value);
      if (sourceError) return sourceError;
      set.data = data.value;
    }

    if (Object.keys(set).length === 0) return errorResponse(400, "Nothing to update");
    const updatedAt = new Date();
    set.updatedAt = updatedAt;

    const oid = new ObjectId(id);
    const result = await db
      .collection("projects")
      .updateOne({ _id: oid, [OWNER_FIELD]: owner, rev: baseRev }, { $set: set, $inc: { rev: 1 } });

    if (result.matchedCount === 0) {
      const current = await db
        .collection("projects")
        .findOne({ _id: oid, [OWNER_FIELD]: owner }, { projection: { rev: 1 } });
      if (!current) return errorResponse(404, "Project not found");
      return NextResponse.json(
        {
          error: "This project was changed somewhere else",
          message: "This project was changed somewhere else",
          currentRev: current.rev,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ rev: baseRev + 1, updatedAt });
  } catch (err) {
    console.error("PUT /projects/:id error:", err);
    return errorResponse(500, "Failed to save project");
  }
}

/** DELETE /api/projects/:id  (owner only) */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const id = parseObjectId((await params).id);
    if (!id) return errorResponse(400, "Invalid project id");

    const owner = new ObjectId(String(auth.user._id));
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const result = await db.collection("projects").deleteOne({ _id: new ObjectId(id), [OWNER_FIELD]: owner });
    if (result.deletedCount === 0) return errorResponse(404, "Project not found");

    return NextResponse.json({ message: "Project deleted" });
  } catch (err) {
    console.error("DELETE /projects/:id error:", err);
    return errorResponse(500, "Failed to delete project");
  }
}
