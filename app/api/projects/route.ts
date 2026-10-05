import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo/mongodb";
import { requireUser, errorResponse, cleanText, OWNER_FIELD } from "@/lib/auth/authz";
import { LIMITS } from "@/lib/projects/projectTypes";
import { validateProjectData } from "@/lib/projects/validateProject";
import { checkProjectSources, readJsonLimited } from "@/lib/projects/server";

/**
 * GET /api/projects
 * The caller's own projects, newest first. The project data itself is not sent here.
 */
export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const owner = new ObjectId(String(auth.user._id));
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const docs = await db
      .collection("projects")
      .aggregate([
        { $match: { [OWNER_FIELD]: owner } },
        { $sort: { updatedAt: -1 } },
        { $limit: 100 },
        {
          $project: {
            name: 1,
            updatedAt: 1,
            createdAt: 1,
            slateCount: { $size: { $ifNull: ["$data.slates", []] } },
          },
        },
      ])
      .toArray();

    return NextResponse.json(
      docs.map((d) => ({
        _id: String(d._id),
        name: d.name,
        updatedAt: d.updatedAt,
        createdAt: d.createdAt,
        slateCount: d.slateCount,
      }))
    );
  } catch (err) {
    console.error("GET /projects error:", err);
    return errorResponse(500, "Failed to load projects");
  }
}

/**
 * POST /api/projects   Body: { name?, data }
 * Creates a project owned by the caller. The owner always comes from the session.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = await readJsonLimited(req);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body as { name?: unknown; data?: unknown } | null;
    if (!body || typeof body !== "object") return errorResponse(400, "Invalid request body");

    const name = body.name === undefined ? "Untitled project" : cleanText(body.name, 100);
    if (!name) return errorResponse(400, "Invalid project name");

    const data = validateProjectData(body.data);
    if (!data.ok) return errorResponse(400, data.error);

    const owner = new ObjectId(String(auth.user._id));
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB!);

    const count = await db.collection("projects").countDocuments({ [OWNER_FIELD]: owner });
    if (count >= LIMITS.maxProjectsPerUser) {
      return errorResponse(409, `You can have up to ${LIMITS.maxProjectsPerUser} projects. Delete one first.`);
    }

    const sourceError = await checkProjectSources(db, owner, data.value);
    if (sourceError) return sourceError;

    const now = new Date();
    const result = await db.collection("projects").insertOne({
      [OWNER_FIELD]: owner,
      name,
      data: data.value,
      rev: 1,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      { _id: result.insertedId.toString(), name, rev: 1, updatedAt: now },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /projects error:", err);
    return errorResponse(500, "Failed to create project");
  }
}
