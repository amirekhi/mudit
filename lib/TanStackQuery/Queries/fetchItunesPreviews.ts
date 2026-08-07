import { Track } from "@/store/useAudioStore";

export interface ItunesPreviewTrack {
  itunesId: number;
  title: string;
  artist: string;
  image: string | null;
  previewUrl: string;
  duration: number | null;
}

/**
 * Fetches ~30s iTunes previews for a query.
 * Mirrors fetchSongs()'s shape so it drops into the same useQuery calls
 * used elsewhere in Mudit.
 */
export async function fetchItunesPreviews(query: string): Promise<ItunesPreviewTrack[]> {
  if (!query.trim()) return [];

  const res = await fetch(`/api/itunes/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];

  const data = await res.json();
  return data.tracks as ItunesPreviewTrack[];
}

/**
 * Adapts an iTunes preview result into Mudit's Track shape so it flows
 * through the existing player (useAudioStore) and card components unchanged.
 *
 * These are NOT persisted/library tracks — they're ephemeral, so:
 * - _id is prefixed to avoid ever colliding with a real Mongo _id
 * - ownerId is null, visibility is "public"
 * - createdAt/updatedAt are just "now", unused for these
 *
 * Note: iTunes preview files are typically .m4a (AAC), not .mp3 — Howler's
 * html5 mode handles this fine in all modern browsers, no conversion needed.
 */
export function itunesTrackToTrack(t: ItunesPreviewTrack): Track {
  const now = new Date().toISOString();
  return {
    _id: `itunes-${t.itunesId}`,
    title: t.title,
    artist: t.artist,
    url: t.previewUrl,
    image: t.image ?? undefined,
    ownerId: null,
    visibility: "public",
    createdAt: now,
    updatedAt: now,
  };
}