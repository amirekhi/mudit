import { auth, currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import User from "@/models/Users";

async function connectDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || "");
  }
}

export async function getDbUser() {
  const { userId } = await auth();
  if (!userId) return null;

  await connectDb();

  const existing = await User.findOne({ clerkId: userId });
  if (existing) return existing;

  // First request from this Clerk user: create their Mongo record
  const c = await currentUser();
  const email = c?.primaryEmailAddress?.emailAddress;
  if (!c || !email) return null;

  try {
    return await User.create({
      clerkId: userId,
      email,
      username: c.username ?? `user_${userId.slice(-8)}`,
      profileImageUrl: c.imageUrl ?? null,
      emailVerified: c.primaryEmailAddress?.verification?.status === "verified",
    });
  } catch (err: any) {
    // Two requests created the user at once (or the webhook beat us): fetch it
    if (err?.code === 11000) return User.findOne({ clerkId: userId });
    throw err;
  }
}