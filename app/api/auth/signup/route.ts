import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import User from "@/models/Users";
import { signToken } from "@/lib/jwt/jwt";
import mongoose from "mongoose";

// Make sure to connect to MongoDB before using models
const MONGODB_URI = process.env.MONGODB_URI || "";
if (!mongoose.connection.readyState) {
  mongoose.connect(MONGODB_URI);
}

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    const token = signToken({ userId: user._id, username: user.username });

    const response = NextResponse.json({
      message: "User created successfully",
      user: { username: user.username, email: user.email },
    });

    // Set cookie with JWT
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
