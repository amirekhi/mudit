// lib/TanStackQuery/Queries/fetchPublicTracksPage.ts
//
// One page of PUBLIC tracks from the server, instead of fetchSongs' "every
// public track in the database". Used by the home carousel, the /trending
// page, and the search bar's library suggestions.

import { Track } from "@/store/useAudioStore";
import type { Paged } from "@/lib/paging/types";

export type TrackSort = "newest" | "title" | "artist";

export async function fetchPublicTracksPage({
  q = "",
  page = 1,
  pageSize = 24,
  sort = "newest",
}: {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
} = {}): Promise<Paged<Track>> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });

  const res = await fetch(`/api/tracks/public?${params}`);
  if (!res.ok) throw new Error("Failed to fetch public tracks");
  return res.json() as Promise<Paged<Track>>;
}
