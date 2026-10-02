import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import User from "@/models/Users";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

/**
 * PATCH /api/user/update-profile
 * Body: { profileImageUrl?: string }
 *
 * Username is owned by Clerk (it is also a sign-in identifier), so the client updates it
 * in Clerk first. This route then copies Clerk's current username into Mongo and saves the avatar.
 * The username is read from Clerk on the server, never taken from the request body.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { profileImageUrl } = body ?? {};

    // Username: Clerk is the source of truth
    const clerkUser = await currentUser();
    const clerkUsername = clerkUser?.username;
    if (clerkUsername && clerkUsername !== user.username) {
      const taken = await User.findOne({ username: clerkUsername, _id: { $ne: user._id } });
      if (taken) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      user.username = clerkUsername;
    }

    // Avatar: only when the client sent a new one
    if (profileImageUrl !== undefined) {
      const valid =
        typeof profileImageUrl === "string" &&
        profileImageUrl.length <= 2048 &&
        (profileImageUrl.startsWith("https://") || profileImageUrl === "/userAvatar.webp");
      if (!valid) {
        return NextResponse.json({ error: "Invalid profile image URL" }, { status: 400 });
      }
      user.profileImageUrl = profileImageUrl;
    }

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
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}