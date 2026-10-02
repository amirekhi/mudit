import { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import mongoose from "mongoose";
import User from "@/models/Users";

// OPTIONAL. getCurrentUser() already creates users lazily; this keeps email/username
// in sync when they change in Clerk and removes the Mongo user when the Clerk user is deleted.
// Needs CLERK_WEBHOOK_SIGNING_SECRET and a public URL (use a tunnel such as ngrok in dev).
// It never touches profileImageUrl: the avatar is owned by the app.

async function connectDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || "");
  }
}

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    await connectDb();

    if (evt.type === "user.created" || evt.type === "user.updated") {
      const d = evt.data;
      const primary =
        d.email_addresses.find((e) => e.id === d.primary_email_address_id) ?? d.email_addresses[0];
      const email = primary?.email_address;
      if (!email) return new Response("ok");

      const set: Record<string, unknown> = {
        email,
        emailVerified: primary?.verification?.status === "verified",
      };
      const setOnInsert: Record<string, unknown> = { role: "user", isActive: true };
      if (d.username) set.username = d.username;
      else setOnInsert.username = `user_${d.id.slice(-8)}`;

      await User.findOneAndUpdate(
        { clerkId: d.id },
        { $set: set, $setOnInsert: setOnInsert },
        { upsert: true }
      );
    }

    if (evt.type === "user.deleted" && evt.data.id) {
      // Decide what should happen to this user's tracks/playlists before enabling a hard delete.
      await User.deleteOne({ clerkId: evt.data.id });
    }

    return new Response("ok");
  } catch (err) {
    console.error("Clerk webhook error:", err);
    return new Response("Webhook handler failed", { status: 500 }); // Clerk will retry
  }
}
