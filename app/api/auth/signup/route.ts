import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "@/models/Users";
import { signToken } from "@/lib/jwt/jwt";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!mongoose.connection.readyState) {
  await mongoose.connect(MONGODB_URI);
}

export async function POST(req: NextRequest) {
  try {
    const {
      username,
      email,
      password,
      profileImageUrl,
    } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      passwordHash,
      profileImageUrl: profileImageUrl || null,
      role: "user",
      isActive: true,
    });

    const token = signToken({
      userId: user._id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      message: "User created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        createdAt: user.createdAt,
      },
    });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
