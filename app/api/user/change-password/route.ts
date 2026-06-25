import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
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

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both fields are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}