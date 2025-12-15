import { PlaylistDb } from "@/types/playlistTypes";

// Mutation function
export const createPlaylist = async (playlist: PlaylistDb): Promise<PlaylistDb> => {
  const res = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(playlist),
  });
  if (!res.ok) throw new Error("Failed to create playlist");
  return res.json() as Promise<PlaylistDb>;
};