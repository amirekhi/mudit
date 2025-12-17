import mongoose from "mongoose";
import User from "@/models/Users";
import { verifyToken } from "@/lib/jwt/jwt";
import { cookies } from "next/headers";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!mongoose.connection.readyState) {
  mongoose.connect(MONGODB_URI);
}

export async function getCurrentUser() {
  try {
    // ✅ cookies() is async in Next.js 14+
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload || typeof payload === "string") return null;

    const user = await User.findById(payload.userId).select("-passwordHash");
    if (!user) return null;
   
    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}
