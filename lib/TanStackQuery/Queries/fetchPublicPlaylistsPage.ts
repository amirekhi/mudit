// lib/TanStackQuery/Queries/fetchPublicPlaylistsPage.ts
//
// One page of PUBLIC playlists (hydrated with their tracks) from the server.
// Used by the home "Hot Playlists" carousel and the /hot-playlists page.

import { Playlist } from "@/components/PlayList/PlaylistCard";
import type { Paged } from "@/lib/paging/types";

export type PlaylistSort = "newest" | "title";

export async function fetchPublicPlaylistsPage({
  q = "",
  page = 1,
  pageSize = 24,
  sort = "newest",
}: {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
} = {}): Promise<Paged<Playlist>> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });

  const res = await fetch(`/api/playlists?${params}`);
  if (!res.ok) throw new Error("Failed to fetch public playlists");
  return res.json() as Promise<Paged<Playlist>>;
}
