import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/Users";
import { verifyToken } from "@/lib/jwt/jwt";

const MONGODB_URI = process.env.MONGODB_URI || "";
if (!mongoose.connection.readyState) {
  await mongoose.connect(MONGODB_URI);
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { username, profileImageUrl } = await req.json();

    if (!username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Check uniqueness — exclude current user
    const existing = await User.findOne({
      username: username.trim(),
      _id: { $ne: payload.userId },
    });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const updated = await User.findByIdAndUpdate(
      payload.userId,
      {
        username: username.trim(),
        ...(profileImageUrl !== undefined && { profileImageUrl }),
      },
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      user: {
        _id: updated._id,
        username: updated.username,
        email: updated.email,
        profileImageUrl: updated.profileImageUrl,
        role: updated.role,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}