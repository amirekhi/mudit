// app/api/proxy/[trackId]/route.ts
import { NextResponse } from "next/server";
import Track from "@/models/Track";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

export async function GET(req: Request, { params }: { params: { trackId: string } }) {
  try {
    const p =  await params;
    const trackId = p.trackId;
    
    const track = await Track.findById(trackId).lean();

    if (!track) return NextResponse.json({ message: "Track not found" }, { status: 404 });

    const res = await fetch(track.url);
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ message: "Failed to fetch track" }, { status: 500 });
  }
}
