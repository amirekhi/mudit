import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import User from "@/models/Users";

async function connectDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || "");
  }
}

/**
 * Returns the Mongo user for the current Clerk session, or null if signed out.
 *
 * - auth() verifies the session token locally (no network call) and gives us the Clerk id.
 * - We then load the Mongo user by clerkId. Everything else in the app keeps using user._id.
 * - On a user's first request the Mongo record doesn't exist yet, so we create it from
 *   Clerk's data (currentUser() is a network call, but it only happens once per user).
 *
 * Same name and export as the old helper, so every route that already calls
 * getCurrentUser() keeps working without changes.
 */
export const getCurrentUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  await connectDb();

  const existing = await User.findOne({ clerkId: userId });
  if (existing) return existing;

  const c = await currentUser();
  const email = c?.primaryEmailAddress?.emailAddress;
  if (!c || !email) return null;

  try {
    return await User.create({
      clerkId: userId,
      email,
      username: c.username ?? `user_${userId.slice(-8)}`,
      emailVerified: c.primaryEmailAddress?.verification?.status === "verified",
    });
  } catch (err: any) {
    // Two requests (or the webhook) created the user at the same moment: fetch theirs.
    if (err?.code === 11000) {
      const again = await User.findOne({ clerkId: userId });
      if (again) return again;
    }
    throw err; // e.g. an email/username clash: surface it instead of looping on /login
  }
});
