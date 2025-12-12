import { NextRequest, NextResponse } from "next/server";
import User from "@/models/Users";
import mongoose from "mongoose";
import { verifyToken } from "@/lib/jwt/jwt";

const MONGODB_URI = process.env.MONGODB_URI || "";
if (!mongoose.connection.readyState) {
  mongoose.connect(MONGODB_URI);
}

export async function GET(req: NextRequest) {
  try {
    // 1. Get the token from the cookies
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ loggedIn: false });

    // 2. Verify JWT
    const payload = verifyToken(token);
    if (!payload || typeof payload === "string") {
      return NextResponse.json({ loggedIn: false });
    }

    // 3. Fetch full user data from MongoDB
    // Exclude sensitive info
    const user = await User.findById(payload.userId).select("-passwordHash");
    if (!user) return NextResponse.json({ loggedIn: false });

    // 4. Return full user data
    return NextResponse.json({ loggedIn: true, user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ loggedIn: false });
  }
}
