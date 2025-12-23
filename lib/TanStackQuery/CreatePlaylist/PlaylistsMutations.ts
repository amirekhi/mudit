import { PlaylistDb } from "@/types/playlistTypes";

export const createPlaylist = async (playlist: PlaylistDb): Promise<PlaylistDb> => {
  const res = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(playlist),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text || "Failed to create playlist");
    (error as any).status = res.status; // attach status code
    throw error;
  }

  return res.json() as Promise<PlaylistDb>;
};