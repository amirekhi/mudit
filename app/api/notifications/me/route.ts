import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

/**
 * GET /api/notifications/me
 * Returns active (not dismissed) notifications for logged-in user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    

      const notifications = await Notification.find({
        userId: user._id,
        dismissed: false,
      })
        .sort({ createdAt: -1 })
        .lean();

      const formatted = notifications.map((n) => ({
        id: n._id.toString(),
        title: n.title,
        description: n.description,
        isRead: n.isRead,
        dismissed: n.dismissed,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));

      return NextResponse.json(formatted);

  } catch (error) {
    console.error("Get user notifications error:", error);

    return NextResponse.json(
      { message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/me
 * Dismiss all notifications for logged-in user
 */
export async function PATCH() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await Notification.updateMany(
      {
        userId: user._id,
        dismissed: false,
      },
      {
        $set: { dismissed: true },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dismiss notifications error:", error);

    return NextResponse.json(
      { message: "Failed to dismiss notifications" },
      { status: 500 }
    );
  }
}
