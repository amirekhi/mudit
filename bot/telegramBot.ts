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

  const name =
    post.caption?.trim() ||
    (file as any).file_name ||
    file.file_id;

  const searchParts = [
    post.caption,
    (file as any).file_name,
    (file as any).title,
    (file as any).performer,
  ].filter((part): part is string => Boolean(part && part.trim()));

  const searchText = Array.from(new Set(searchParts)).join(" ").toLowerCase();

  const entry: EffectEntry = {
    id: makeShortId(),
    name,
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