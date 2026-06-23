// app/api/proxy/[trackId]/route.ts
import { NextResponse } from "next/server";
import Track from "@/models/Track";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const track = await Track.findById(id).lean();

  if (!track)
    return NextResponse.json({ message: "Track not found" }, { status: 404 });

  const res = await fetch(track.url);
  const arrayBuffer = await res.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
}
