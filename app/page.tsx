"use client";

import MusicCarousel from "@/components/explorerUi/MusicCarousel";
import PlaylistCarousel from "@/components/PlayList/PlaylistCarousel";
import { IconSearch } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Track } from "@/store/useAudioStore"; // adjust imports if needed
import { fetchSongs } from "@/lib/TanStackQuery/Queries/fetchSongs";
import fetchPlaylists from "@/lib/TanStackQuery/Queries/fetchPlaylists";

export default function Home() {
  const searchValueRef = useRef(""); 
  const [debouncedQuery, setDebouncedQuery] = useState("");


  const { data: playlists = [], isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ["playlists"],
    queryFn: fetchPlaylists,
  });

  
  const { data: tracks = [], isLoading: tracksLoading, error: tracksError } = useQuery({
    queryKey: ["songs"],
    queryFn: fetchSongs,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchValueRef.current = e.target.value;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchValueRef.current);
    }, 600);
  };

  const filteredTracks = tracks.filter(
    (track: Track) =>
      track.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  if (playlistsLoading || tracksLoading)
    return <div className="p-6 text-center text-neutral-500">Loading...</div>;

  if (playlistsError || tracksError)
    return (
      <div className="p-6 text-center text-red-500">
        Failed to load data.
      </div>
    );

  return (
    <div className="p-6 flex flex-col gap-8">

      <div className="relative max-w-md w-full mx-auto">
        <input
          type="text"
          placeholder="Search for music..."
          defaultValue=""
          onChange={handleInputChange}
          className="w-full rounded-full border border-neutral-300 bg-neutral-100 px-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />
        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 dark:text-neutral-300" />
      </div>

  
      <PlaylistCarousel
        title="Your Playlists"
        playlists={playlists} 
      />

      <div className="relative">
        <MusicCarousel tracks={filteredTracks} title="Trending" />
      </div>
    </div>
  );
}
