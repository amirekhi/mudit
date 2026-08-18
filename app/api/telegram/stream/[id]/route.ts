// app/api/telegram/stream/[id]/route.ts
//
// GET /api/telegram/stream/<shortId>
//
// Checks the in-memory cache first (see bot/fileCache.ts). On a cache hit,
// serves the buffered bytes directly — no Telegram round-trip at all, which
// is what makes replay/scrubbing feel instant. On a miss, downloads fresh
// from Telegram, caches the result, then serves it. Either way, nothing
// ever touches disk — the only place these bytes live is process memory,
// and they're gone the moment the server restarts or the TTL expires.

import { NextRequest, NextResponse } from "next/server";
import { findById } from "@/bot/store";
import { getCachedFile, setCachedFile } from "@/bot/fileCache";

const token = process.env.TELEGRAM_BOT_TOKEN;

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

  // Cache hit — serve straight from memory, no Telegram call at all.
  const cached = getCachedFile(id);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "Content-Type": cached.mimeType,
        "Cache-Control": "no-store", // this header is about the BROWSER not caching, unrelated to our own in-memory cache
      },
    });
  }

  // Cache miss — ask Telegram where the actual bytes live right now.
  // getFile responses are short-lived (the file_path expires), so we only
  // ever call this on a miss, never speculatively.
  const getFileRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${entry.fileId}`
  );
  const getFileJson = await getFileRes.json();

  if (!getFileJson.ok) {
    console.error("Telegram getFile failed:", getFileJson);
    return NextResponse.json(
      { message: "Could not resolve file from Telegram" },
      { status: 502 }
    );
  }

  const filePath = getFileJson.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok || !fileRes.body) {
    return NextResponse.json(
      { message: "Failed to download file from Telegram" },
      { status: 502 }
    );
  }

  // We need the full bytes in hand to cache them, so buffer the response
  // here rather than streaming it straight through as the previous version
  // did. These files are small effects/tracks, not large enough for this
  // to be a meaningful memory concern.
  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  setCachedFile(id, buffer, entry.mimeType);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": entry.mimeType,
      "Cache-Control": "no-store",
    },
  });
}