// lib/TanStackQuery/Queries/fetchTelegramEffects.ts
//
// Client-side helper for SearchBar's Telegram-effects suggestions.
// Mirrors the shape of fetchItunesPreviews so the two sit side by side
// naturally in the dropdown.

import { Track } from "@/store/useAudioStore";

export interface TelegramEffectResult {
  id: string; // short id from bot/index.json, used to build the stream URL
  name: string;
  image?: string; // present only if the source upload had an embedded thumbnail
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

// Maps a search result into the same Track shape the rest of the app uses,
// so it can be handed straight to useAudioStore's playTrack/setTrack.
// The `url` points at our own streaming proxy — Howler just treats it like
// any other playable URL, it has no idea the bytes originate from Telegram.
export function telegramResultToTrack(result: TelegramEffectResult): Track {
  const now = new Date().toISOString();
  return {
    _id: `telegram-${result.id}`,
    title: result.name,
    artist: "Telegram",
    url: `/api/telegram/stream/${result.id}`,
    image: result.image, // undefined when no thumbnail — SearchBar already falls back to /test.jpg
    visibility: "private",
    createdAt: now,
    updatedAt: now,
  };
}