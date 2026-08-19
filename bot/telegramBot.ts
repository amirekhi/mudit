// bot/telegramBot.ts
//
// The actual bot instance + handlers, shared between two different entry
// points:
//   - bot/runBot.ts        -> local dev, long polling
//   - app/api/telegram/webhook/route.ts -> production on Vercel, webhook
// Keeping the handler logic here means channel_post indexing is defined
// ONCE, not duplicated between a polling script and a webhook route.

import { Bot } from "grammy";
import { addEntry, type EffectEntry } from "./store";
import { randomBytes } from "crypto";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing — check your environment variables");
}

export const bot = new Bot(token);

function makeShortId(): string {
  return randomBytes(6).toString("hex");
}

bot.on("channel_post", async (ctx) => {
  const post = ctx.channelPost;

  const file = post.audio ?? post.document;
  if (!file) return; // ignore text-only posts, images, etc.

  // `name`/`artist` derivation, in priority order:
  //   1. ID3 tags (performer/title) if this was uploaded as proper `audio`
  //      with metadata — most reliable when present.
  //   2. Otherwise, parse an "Artist - Title" pattern out of the filename.
  //   3. Otherwise, the whole cleaned filename becomes the title, artist
  //      stays unset (frontend falls back to a neutral label for this case).
  const rawFileName = (file as any).file_name as string | undefined;
  const id3Performer = ((file as any).performer as string | undefined)?.trim();
  const id3Title = ((file as any).title as string | undefined)?.trim();

  // Strip extension first, THEN swap underscores for spaces — but
  // deliberately leave hyphens alone here, since "Artist - Title" relies
  // on that exact " - " delimiter to split on next.
  const nameNoExt = rawFileName
    ?.replace(/\.[a-zA-Z0-9]+$/, "")
    .replace(/_+/g, " ")
    .trim();

  // Matches "Artist - Title" (optionally with extra " - 320"-style bitrate
  // suffixes, which several of your real test files had — e.g.
  // "_Unknown Artist - Man Delam Nemikhast - 320.mp3").
  const dashMatch = nameNoExt?.match(/^(.+?)\s*-\s*(.+)$/);
  const filenameArtist = dashMatch?.[1]?.trim();
  const filenameTitle = (dashMatch?.[2] ?? nameNoExt)
    ?.replace(/\s*-\s*\d{2,4}$/, "") // trailing bitrate marker, e.g. "- 320"
    .trim();

  const artist = id3Performer || filenameArtist || undefined;

  const name =
    id3Title ||
    filenameTitle ||
    post.caption?.trim() ||
    file.file_id;

  // searchText still includes EVERY text field — filename, caption, ID3
  // title/performer — so search stays broad even though display prefers
  // the parsed title/artist specifically.
  const searchParts = [
    rawFileName,
    post.caption,
    id3Title,
    id3Performer,
  ].filter((part): part is string => Boolean(part && part.trim()));

  const searchText = Array.from(new Set(searchParts)).join(" ").toLowerCase();

  const entry: EffectEntry = {
    id: makeShortId(),
    name,
    artist,
    searchText,
    fileId: file.file_id,
    mimeType: (file as any).mime_type ?? "audio/mpeg",
    thumbFileId: (file as any).thumbnail?.file_id ?? (file as any).thumb?.file_id,
    addedAt: new Date().toISOString(),
  };

  await addEntry(entry);
  console.log(`[indexed] "${entry.name}" -> ${entry.id}`);
});

bot.command("whereami", (ctx) => {
  ctx.reply(`This chat's id is: ${ctx.chat.id}`);
});

bot.catch((err) => {
  console.error("[bot error]", err);
});