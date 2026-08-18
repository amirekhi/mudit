// scripts/setWebhook.ts
//
// Run this ONCE after deploying to Vercel (and again any time your
// deployment URL changes) to tell Telegram where to send updates:
//
//   npx tsx scripts/setWebhook.ts https://your-app.vercel.app
//
// This is a one-off registration call, not something that runs on every
// deploy — Telegram remembers the webhook URL until you change or delete it.

import { config } from "dotenv";
config({ path: ".env.local" });

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const publicUrl = process.argv[2];

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing — check your .env.local");
}
if (!secret) {
  throw new Error(
    "TELEGRAM_WEBHOOK_SECRET is missing — pick any random string, put it in .env.local AND your Vercel project's environment variables, then rerun this."
  );
}
if (!publicUrl) {
  throw new Error(
    "Pass your deployed URL as an argument, e.g.\n  npx tsx scripts/setWebhook.ts https://your-app.vercel.app"
  );
}

const webhookUrl = `${publicUrl.replace(/\/$/, "")}/api/telegram/webhook`;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
});

const json = await res.json();
console.log(json);

if (json.ok) {
  console.log(`\n✅ Webhook registered: ${webhookUrl}`);
} else {
  console.log(`\n❌ Something went wrong — see the response above.`);
}