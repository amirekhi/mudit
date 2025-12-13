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
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || typeof payload === "string") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(payload.userId).select("-passwordHash");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ loggedIn: true, user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
