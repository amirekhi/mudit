// lib/TanStackQuery/Queries/fetchTelegramEffects.ts
//
// Client-side helpers for Telegram effects: SearchBar suggestions, the home
// feed's soundboard row, and the track detail page's single-item lookup.
// Mirrors the shape of fetchItunesPreviews so the two sit side by side
// naturally in the dropdown.

import { Track } from "@/store/useAudioStore";

// Track ids for Telegram effects are `telegram-<shortId>`. Exported so the
// track page can detect them and strip the prefix without duplicating the
// string.
export const TELEGRAM_ID_PREFIX = "telegram-";

export interface TelegramEffectResult {
  id: string; // short id from the effect index, used to build the stream URL
  name: string;
  artist?: string; // ID3 performer tag or parsed from filename — see bot/telegramBot.ts
  image?: string; // present only if the source upload had an embedded thumbnail
  addedAt?: string; // ISO string from the index
}

export async function fetchTelegramEffects(
  query: string
): Promise<TelegramEffectResult[]> {
  const res = await fetch(
    `/api/telegram/search?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error("Telegram effects search failed");
  return res.json() as Promise<TelegramEffectResult[]>;
}

// Single-entry lookup for the track detail page. Returns null on 404 so the
// page can show "Track not found" instead of an error state.
export async function fetchTelegramEffect(
  shortId: string
): Promise<TelegramEffectResult | null> {
  const res = await fetch(`/api/telegram/effect/${encodeURIComponent(shortId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Telegram effect lookup failed");
  return res.json() as Promise<TelegramEffectResult>;
}

// Maps a result into the same Track shape the rest of the app uses, so it
// can be handed straight to useAudioStore's playTrack/setTrack. The `url`
// points at our own streaming proxy — Howler just treats it like any other
// playable URL, it has no idea the bytes originate from Telegram.
export function telegramResultToTrack(result: TelegramEffectResult): Track {
  // Prefer the real indexed date; fall back to "now" only if the API
  // response didn't include one.
  const stamp = result.addedAt ?? new Date().toISOString();
  return {
    _id: `${TELEGRAM_ID_PREFIX}${result.id}`,
    title: result.name,
    artist: result.artist || "Unknown Artist", // real ID3/filename-derived artist when available, never the source platform's name
    url: `/api/telegram/stream/${result.id}`,
    image: result.image, // undefined when no thumbnail — SearchBar already falls back to /test.jpg
    visibility: "private",
    createdAt: stamp,
    updatedAt: stamp,
  };
}