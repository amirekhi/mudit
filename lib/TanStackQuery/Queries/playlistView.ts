import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import type { PlaylistView, PlaylistViewTrack } from "@/lib/recs/playlistView";

export type { PlaylistView, PlaylistViewTrack };

export const playlistViewKey = (id: string) => ["playlist-view", id] as const;

export async function fetchPlaylistView(id: string): Promise<PlaylistView | null> {
  const res = await authFetch(`/api/playlists/${id}/view`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Couldn't load this playlist");
  return res.json();
}

/** null = it doesn't exist (or isn't yours to see). */
export function usePlaylistView(id: string) {
  return useQuery<PlaylistView | null, Error>({
    queryKey: playlistViewKey(id),
    queryFn: () => fetchPlaylistView(id),
  });
}