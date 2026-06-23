"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { IconSearch, IconPlus, IconEdit } from "@tabler/icons-react";

import MusicCarousel from "@/components/explorerUi/MusicCarousel";
import PublicMusicCarousel from "@/components/PlayList/PublicMusicCarousel";
import PlaylistCarousel from "@/components/PlayList/PlaylistCarousel";
import PublicPlaylistCarousel from "@/components/PlayList/PublicPlaylistCarousel";

import { Track } from "@/store/useAudioStore";
import { Playlist } from "@/components/PlayList/PlaylistCard";
import { fetchSongs } from "@/lib/TanStackQuery/Queries/fetchSongs";
import fetchPlaylists from "@/lib/TanStackQuery/Queries/fetchPlaylists";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";

export default function Home() {
  const router = useRouter();
  const searchValueRef = useRef("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { data: user, isLoading: userLoading } = useCurrentUser();

  const { data: publicPlaylists = [], isLoading: publicPlaylistsLoading } =
    useQuery<Playlist[], Error>({
      queryKey: ["playlists", "public"],
      queryFn: fetchPlaylists,
    });

  const { data: userPlaylists = [], isLoading: userPlaylistsLoading } =
    useQuery<Playlist[], Error>({
      queryKey: ["playlists", "me"],
      queryFn: async () => {
        try {
          const res = await authFetch("/api/playlists/me");
          if (!res.ok) throw new Error();
          return res.json() as Promise<Playlist[]>;
        } catch { return []; }
      },
    });

  const { data: tracks = [], isLoading: tracksLoading } =
    useQuery<Track[], Error>({ queryKey: ["songs"], queryFn: fetchSongs });

  const { data: userTracks = [], isLoading: userTracksLoading } =
    useQuery<Track[], Error>({
      queryKey: ["user-tracks"],
      queryFn: async () => {
        try {
          const res = await authFetch("/api/tracks/me");
          if (!res.ok) throw new Error();
          return res.json() as Promise<Track[]>;
        } catch { return []; }
      },
    });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchValueRef.current = e.target.value;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebouncedQuery(searchValueRef.current), 600);
  };

  const filteredTracks = tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  if (publicPlaylistsLoading || userPlaylistsLoading || tracksLoading || userTracksLoading) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        Loading…
      </div>
    );
  }

  const primaryBtn =
    "relative inline-flex items-center gap-2 h-10 px-5 rounded-full " +
    "bg-gradient-to-b from-indigo-500 to-indigo-600 " +
    "text-white font-medium shadow-md shadow-indigo-600/30 " +
    "hover:from-indigo-400 hover:to-indigo-600 " +
    "hover:shadow-lg hover:shadow-indigo-600/40 " +
    "active:scale-[0.98] transition-all text-sm";

  const secondaryBtn =
    "relative inline-flex items-center gap-2 h-10 px-5 rounded-full " +
    "bg-white/5 backdrop-blur border border-white/10 " +
    "text-white font-medium " +
    "hover:bg-white/10 hover:border-white/20 " +
    "active:scale-[0.98] transition-all text-sm";

  return (
    <div className="relative w-full overflow-x-hidden">
      <div className="p-4 md:p-6 pb-48 flex flex-col gap-8">

        {/* ── Top bar ─────────────────────────────────────────────
            Desktop: search centred, buttons absolute top-right (original).
            Mobile:  single column — buttons row on top, search below.     */}

        {/* Mobile-only button row */}
        <div className="flex items-center gap-2 md:hidden">
          {!userLoading && (
            user ? (
              <>
                <button onClick={() => router.push("/createHub")} className={primaryBtn}>
                  <IconPlus className="w-4 h-4" /> New
                </button>
                <button onClick={() => router.push("/edit")} className={secondaryBtn}>
                  <IconEdit className="w-4 h-4" /> Edit
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push("/login")} className={secondaryBtn}>Login</button>
                <button onClick={() => router.push("/Signup")} className={primaryBtn}>Sign up</button>
              </>
            )
          )}
        </div>

        {/* Search — full width on mobile, centred max-md on desktop */}
        <div className="relative w-full md:max-w-md md:mx-auto">
          <input
            type="text"
            placeholder="Search for music..."
            onChange={handleInputChange}
            className="w-full rounded-full border border-neutral-700 bg-neutral-800
              px-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400
              dark:text-white"
          />
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        </div>

        {/* Desktop-only absolute buttons (original position) */}
        <div className="hidden md:flex absolute top-6 right-6 items-center gap-3 z-50">
          {!userLoading && (
            user ? (
              <>
                <button onClick={() => router.push("/createHub")} className={primaryBtn}>
                  <IconPlus className="w-4 h-4" /> New
                </button>
                <button onClick={() => router.push("/edit")} className={secondaryBtn}>
                  <IconEdit className="w-4 h-4" /> Edit
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push("/login")} className={secondaryBtn}>Login</button>
                <button onClick={() => router.push("/Signup")} className={primaryBtn}>Sign up</button>
              </>
            )
          )}
        </div>

        {/* Content */}
        <PublicPlaylistCarousel title="Hot Playlists" playlists={publicPlaylists} />
        {userPlaylists.length > 0 && (
          <PlaylistCarousel title="Your Playlists" playlists={userPlaylists} />
        )}
        <PublicMusicCarousel title="Trending" tracks={filteredTracks} />
        {userTracks.length > 0 && (
          <MusicCarousel title="Your taste" tracks={userTracks} />
        )}
      </div>
    </div>
  );
}