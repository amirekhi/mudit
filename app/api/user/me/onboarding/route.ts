import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const DEFAULT_AVATAR = "/userAvatar.webp";

/**
 * POST /api/users/me/onboarding
 * Body: { profileImageUrl?: string | null }
 * Saves the profile photo (or the default avatar when skipped) and marks the user as onboarded.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const input = body?.profileImageUrl;

    let profileImageUrl = DEFAULT_AVATAR;
    if (input !== undefined && input !== null) {
      const valid =
        typeof input === "string" &&
        input.length <= 2048 &&
        (input.startsWith("https://") || input === DEFAULT_AVATAR);
      if (!valid) {
        return NextResponse.json({ error: "Invalid profile image URL" }, { status: 400 });
      }
      profileImageUrl = input;
    }

    user.profileImageUrl = profileImageUrl;
    user.onboarded = true;
    await user.save();

    return NextResponse.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        onboarded: user.onboarded,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
