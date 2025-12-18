import { Playlist } from "@/components/PlayList/PlaylistCard";

export default async function fetchPlaylists(): Promise<Playlist[]> {
  const res = await fetch("/api/playlists/public");
  if (!res.ok) throw new Error("Failed to fetch playlists");
  return res.json();
};