// lib/TanStackQuery/Queries/fetchTrackById.ts
//
// Loads ONE track via GET /api/tracks/:id, which already applies the right
// visibility rule (public = anyone, private = owner only, otherwise 404).
// The track detail page used to download every public track plus every one
// of the user's tracks just to .find() a single id.

import { Track } from "@/store/useAudioStore";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";

// Returns null on 404 so the page can show "Track not found".
export async function fetchTrackById(id: string): Promise<Track | null> {
  const url = `/api/tracks/${encodeURIComponent(id)}`;

  // authFetch so an owner can open their own PRIVATE track; fall back to a
  // plain fetch so a guest viewing a public track never depends on auth.
  let res: Response;
  try {
    res = await authFetch(url);
  } catch {
    res = await fetch(url);
  }

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch track");
  return res.json() as Promise<Track>;
}
