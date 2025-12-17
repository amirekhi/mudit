"use client";

import MusicCarousel from "@/components/explorerUi/MusicCarousel";
import PlaylistCarousel from "@/components/PlayList/PlaylistCarousel";
import { IconSearch, IconPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Track } from "@/store/useAudioStore";
import { fetchSongs } from "@/lib/TanStackQuery/Queries/fetchSongs";
import fetchPlaylists from "@/lib/TanStackQuery/Queries/fetchPlaylists";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";

export default function Home() {
  const router = useRouter();
  const searchValueRef = useRef("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Fetch public playlists
  const { data: playlists = [], isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ["playlists"],
    queryFn: fetchPlaylists,
  });

  // Fetch all tracks for Trending
  const { data: tracks = [], isLoading: tracksLoading, error: tracksError } = useQuery({
    queryKey: ["songs"],
    queryFn: fetchSongs,
  });

  // Fetch "Your taste" tracks from /api/tracks/me (no filtering)
  const { data: userTracks = [], isLoading: userTracksLoading, error: userTracksError } = useQuery({
    queryKey: ["user-tracks"],
    queryFn: async () => {
      const res = await authFetch("/api/tracks/me");
      if (!res.ok) throw new Error("Failed to fetch user tracks");
      return res.json() as Promise<Track[]>;
    },
  });

  // Debounced search
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

  if (playlistsLoading || tracksLoading || userTracksLoading)
    return <div className="p-6 text-center text-neutral-500">Loading...</div>;

  if (playlistsError || tracksError || userTracksError)
    return (
      <div className="p-6 text-center text-red-500">
        Failed to load data.
      </div>
    );

  return (
    <div className="p-6 flex flex-col gap-8 relative">
      {/* Absolute button */}
      <button
        onClick={() => router.push("/createHub")}
        className="absolute top-6 right-12 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700 transition z-50"
      >
        <IconPlus className="w-4 h-4" />
        New
      </button>

      {/* Search input */}
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

      {/* Playlists carousel */}
      <PlaylistCarousel title="Your Playlists" playlists={playlists} />

      {/* Trending carousel */}
      <div className="relative">
        <MusicCarousel tracks={filteredTracks} title="Trending" />
      </div>

      {/* Your Taste carousel */}
      <div className="relative">
        <MusicCarousel tracks={userTracks} title="Your taste" />
      </div>
    </div>
  );
}
