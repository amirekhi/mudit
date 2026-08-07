import { Track } from "@/store/useAudioStore";

export interface DeezerPreviewTrack {
  deezerId: number;
  title: string;
  artist: string;
  image: string | null;
  previewUrl: string;
  duration: number;
}

/**
 * Fetches 30s Deezer previews for a query.
 * Mirrors the shape/pattern of fetchSongs() so it drops into the same
 * useQuery calls used elsewhere in Mudit.
 */
export async function fetchDeezerPreviews(query: string): Promise<DeezerPreviewTrack[]> {
  if (!query.trim()) return [];

  const res = await fetch(`/api/deezer/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];

  const data = await res.json();
  return data.tracks as DeezerPreviewTrack[];
}

/**
 * Adapts a Deezer preview result into Mudit's Track shape so it can flow
 * through the existing player (useAudioStore) and card components unchanged.
 *
 * These are NOT persisted/library tracks — they're ephemeral, so:
 * - _id is prefixed to avoid ever colliding with a real Mongo _id
 * - ownerId is null, visibility is "public"
 * - createdAt/updatedAt are just "now", they're unused for these
 */
export function deezerTrackToTrack(d: DeezerPreviewTrack): Track {
  const now = new Date().toISOString();
  return {
    _id: `deezer-${d.deezerId}`,
    title: d.title,
    artist: d.artist,
    url: d.previewUrl,
    image: d.image ?? undefined,
    ownerId: null,
    visibility: "public",
    createdAt: now,
    updatedAt: now,
  };
}