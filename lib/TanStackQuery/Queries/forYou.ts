import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import type { HomeForYou, HomeTrack, MadeForYouPlaylist } from "@/lib/recs/home";

export type { HomeForYou, HomeTrack, MadeForYouPlaylist };

export const FOR_YOU_KEY = ["home", "for-you"] as const;

export async function fetchForYou(): Promise<HomeForYou> {
  const res = await authFetch("/api/home/for-you");
  if (!res.ok) throw new Error("Couldn't load your picks");
  return res.json();
}

/** Playlists made from your tastes, songs blended from them, and what you played lately. */
export function useForYou(enabled: boolean) {
  return useQuery<HomeForYou, Error>({
    queryKey: FOR_YOU_KEY,
    queryFn: fetchForYou,
    enabled,
    staleTime: 60_000,
  });
}