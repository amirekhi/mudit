// app/api/telegram/webhook/route.ts
//
// PRODUCTION ENTRY POINT. Telegram POSTs updates here instead of us
// polling for them. Uses the exact same handler logic as local dev
// (bot/telegramBot.ts) — only the delivery mechanism differs.
//
// Security: Telegram lets you set a `secret_token` when registering the
// webhook (see scripts/setWebhook.ts). It then includes that token in an
// `X-Telegram-Bot-Api-Secret-Token` header on every request. We check it
// manually below so a random POST to this URL from anyone else on the
// internet can't be mistaken for a real Telegram update.

import { webhookCallback } from "grammy";
import { bot } from "@/bot/telegramBot";
import { NextRequest } from "next/server";

const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

// grammy's "std/http" adapter expects/returns the standard Request/Response
// objects, which is exactly what a Next.js App Router route handler uses —
// no extra glue needed.
const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(req: NextRequest) {
  if (webhookSecret) {
    const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (incomingSecret !== webhookSecret) {
      // Don't leak *why* — just reject anything that isn't genuinely from Telegram.
      return new Response("Unauthorized", { status: 401 });
    }
  }

  return handleUpdate(req);
}