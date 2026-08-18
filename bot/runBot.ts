// bot/runBot.ts
//
// LOCAL DEV ONLY. Run with: npm run bot:dev
// Production on Vercel uses app/api/telegram/webhook/route.ts instead —
// serverless functions can't run a persistent polling loop. This script
// just starts long polling against the shared bot/handlers defined in
// bot/telegramBot.ts, so you don't need a public URL/webhook while
// developing locally.

import { setDefaultResultOrder } from "dns";
// Works around a common Windows/network issue where Node's IPv6-first
// resolution hangs on networks with broken IPv6 routing, even though
// browsers work fine (they fall back to IPv4 silently).
setDefaultResultOrder("ipv4first");

import { config } from "dotenv";
config({ path: ".env.local" }); // dotenv defaults to ".env" — Next uses ".env.local"

import { bot } from "./telegramBot";

console.log("Starting bot with long polling... (Ctrl+C to stop)");
bot.start();