// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import User from "@/models/Users";
import { signToken } from "@/lib/jwt/jwt";
import mongoose from "mongoose";

// Ensure MongoDB is connected
const MONGODB_URI = process.env.MONGODB_URI || "";
if (!mongoose.connection.readyState) {
  mongoose.connect(MONGODB_URI);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = signToken({ userId: user._id, username: user.username });

    const response = NextResponse.json({
      message: "Login successful",
      user: {
          _id: user._id,  
          username: user.username,
          email: user.email,
          profileImageUrl: user.profileImageUrl || null,
          role: user.role,
          createdAt: user.createdAt,
      },
    });

    // Set JWT in HttpOnly cookie
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
