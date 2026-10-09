// lib/TanStackQuery/Queries/fetchArtistsPage.ts
//
// One page of artists from the server, instead of "every artist". Used by
// the home Artists carousel and the /artists page.

import type { Paged } from "@/lib/paging/types";
import type { ArtistSummary } from "@/components/artists/ArtistCarouselCard";

export type ArtistSort = "popular" | "name";

// Generic so the /artists page can ask for ArtistCard's own ArtistSummary
// type while the carousel uses ArtistCarouselCard's.
export async function fetchArtistsPage<T = ArtistSummary>({
  q = "",
  page = 1,
  pageSize = 24,
  sort = "popular",
}: {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
} = {}): Promise<Paged<T>> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });

  const res = await fetch(`/api/artists?${params}`);
  if (!res.ok) throw new Error("Failed to fetch artists");
  return res.json() as Promise<Paged<T>>;
}
