"use client";

import MusicCarousel from "@/components/explorerUi/MusicCarousel";
import { IconSearch } from "@tabler/icons-react";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSongs } from "@/lib/TanStackQuery/Queries/fetchSongs";
import { Track } from "@/store/useAudioStore";

export default function Home() {
  const searchValueRef = useRef(""); // only one ref needed
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: tracks = [], isLoading, error } = useQuery({
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

  if (isLoading)
    return <div className="p-6 text-center text-neutral-500">Loading...</div>;

  if (error)
    return (
      <div className="p-6 text-center text-red-500">
        Failed to load songs.
      </div>
    );

  return (
    <div className="p-6 flex flex-col gap-8">
      {/* Search Bar */}
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

      {/* Carousels */}
      <div className="relative">
        <MusicCarousel tracks={filteredTracks} title="Your Music" />
      </div>
      <div className="relative">
        <MusicCarousel tracks={filteredTracks} title="Trending" />
      </div>
    </div>
  );
}
