// app/api/telegram/thumb/[id]/route.ts
//
// GET /api/telegram/thumb/<shortId>
//
// Same on-demand fetch + in-memory cache pattern as the audio stream route,
// but for the embedded thumbnail Telegram attaches to audio uploads.
// Returns 404 if this entry never had a thumbnail — the frontend already
// falls back to a default image in that case (see SearchBar).

import { NextRequest, NextResponse } from "next/server";
import { findById } from "@/bot/store";
import { getCachedFile, setCachedFile } from "@/bot/fileCache";

const token = process.env.TELEGRAM_BOT_TOKEN;

// Prefixed so thumbnail bytes never collide in the cache with the audio
// bytes for the same entry id — they're cached under different keys.
function cacheKey(id: string) {
  return `thumb:${id}`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!token) {
    return NextResponse.json(
      { message: "Server misconfigured: missing bot token" },
      { status: 500 }
    );
  }

  const entry = await findById(id);
  if (!entry) {
    return NextResponse.json({ message: "Effect not found" }, { status: 404 });
  }
  if (!entry.thumbFileId) {
    return NextResponse.json({ message: "No thumbnail for this effect" }, { status: 404 });
  }

  const cached = getCachedFile(cacheKey(id));
  if (cached) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      status: 200,
      headers: { "Content-Type": cached.mimeType, "Cache-Control": "no-store" },
    });
  }

  const getFileRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${entry.thumbFileId}`
  );
  const getFileJson = await getFileRes.json();

  if (!getFileJson.ok) {
    console.error("Telegram getFile (thumb) failed:", getFileJson);
    return NextResponse.json(
      { message: "Could not resolve thumbnail from Telegram" },
      { status: 502 }
    );
  }

  const filePath = getFileJson.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok || !fileRes.body) {
    return NextResponse.json(
      { message: "Failed to download thumbnail from Telegram" },
      { status: 502 }
    );
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = "image/jpeg"; // Telegram thumbnails are always JPEG

  setCachedFile(cacheKey(id), buffer, mimeType);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: { "Content-Type": mimeType, "Cache-Control": "no-store" },
  });
}