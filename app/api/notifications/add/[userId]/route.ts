import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Notification from "@/models/Notification";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

interface Params {
  params: {
    userId: string;
  };
}

export async function POST(request: Request, { params }: {params: { userId: string }}) {
  try {
    const currentUser = await getCurrentUser();

    // 1️⃣ Check authentication
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2️⃣ Check admin
    if (currentUser.role != "admin") {
      return NextResponse.json(
        { message: "Forbidden - Admins only" },
        { status: 403 }
      );
    }

    const { userId } = await params;



    // 3️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json(
        { message: "Title and description are required" },
        { status: 400 }
      );
    }

    // 4️⃣ Create notification
    const notification = await Notification.create({
      title,
      description,
      userId,
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
