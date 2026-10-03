import { NextResponse } from "next/server";
import Notification from "@/models/Notification";
import User from "@/models/Users";
import { requireAdmin, errorResponse, parseObjectId, cleanText } from "@/lib/auth/authz";

/**
 * POST /api/notifications/:userId   (admins only)
 * Same behaviour as before, plus: length limits, string-only fields, and a check that the
 * target user exists. The top-level mongoose.connect is no longer needed because
 * requireAdmin() -> getCurrentUser() opens the connection.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin(); // 401 if signed out, 403 if not an admin
    if (!auth.ok) return auth.response;

    const userId = parseObjectId((await params).userId);
    if (!userId) return errorResponse(400, "Invalid user ID");

    const body = await request.json().catch(() => null);
    const title = cleanText(body?.title, 120);
    const description = cleanText(body?.description, 1000);
    if (!title || !description) {
      return errorResponse(400, "Title and description are required");
    }

    if (!(await User.exists({ _id: userId }))) {
      return errorResponse(404, "User not found");
    }

    const notification = await Notification.create({ title, description, userId });
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Internal Server Error");
  }
}