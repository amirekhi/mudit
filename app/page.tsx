"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { IconPlus, IconEdit } from "@tabler/icons-react";

import HeroPlaylistCarousel from "@/components/PlayList/HeroPlaylistCarousel";
import ShelfPlaylistCarousel from "@/components/PlayList/ShelfPlaylistCarousel";
import ChartCarousel from "@/components/explorerUi/ChartCarousel";
import VinylCarousel from "@/components/explorerUi/VinylCarousel";
import ArtistCarousel from "@/components/artists/ArtistCarousel";
import { ArtistSummary } from "@/components/artists/ArtistCarouselCard";
import SearchBar from "@/components/basics/SearchBar";
import ThemeToggle from "@/components/basics/ThemeToggle";

import { Track } from "@/store/useAudioStore";
import { Playlist } from "@/components/PlayList/PlaylistCard";
import { fetchSongs } from "@/lib/TanStackQuery/Queries/fetchSongs";
import fetchPlaylists from "@/lib/TanStackQuery/Queries/fetchPlaylists";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { shuffleArray } from "@/util/shuffle";

export default function Home() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  const { data: publicPlaylists = [], isLoading: publicPlaylistsLoading } =
    useQuery<Playlist[], Error>({ queryKey: ["playlists", "public"], queryFn: fetchPlaylists });

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

  const { data: artists = [], isLoading: artistsLoading } =
    useQuery<ArtistSummary[], Error>({
      queryKey: ["artists"],
      queryFn: async () => {
        try {
          const res = await fetch("/api/artists");
          if (!res.ok) throw new Error();
          return res.json() as Promise<ArtistSummary[]>;
        } catch { return []; }
      },
    });

  // Shuffled once per fetch (not on every re-render) so the feed order
  // actually varies between visits instead of always matching DB order.
  const shuffledHotPlaylists = useMemo(() => shuffleArray(publicPlaylists), [publicPlaylists]);
  const shuffledTrending = useMemo(() => shuffleArray(tracks), [tracks]);
  const shuffledYourPlaylists = useMemo(() => shuffleArray(userPlaylists), [userPlaylists]);
  const shuffledYourTracks = useMemo(() => shuffleArray(userTracks), [userTracks]);

  // All tracks merged for the SearchBar dropdown — left unshuffled on purpose,
  // search results should stay predictable even if the feed doesn't.
  const allTracks = [
    ...tracks,
    ...userTracks.filter(ut => !tracks.some(t => t._id === ut._id)),
  ];

  if (
    publicPlaylistsLoading ||
    userPlaylistsLoading ||
    tracksLoading ||
    userTracksLoading ||
    artistsLoading
  ) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        Loading…
      </div>
    );
  }

  const primaryBtn =
    "relative inline-flex items-center gap-2 h-10 px-5 rounded-full " +
    "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white font-medium " +
    "shadow-md shadow-indigo-600/30 hover:from-indigo-400 hover:to-indigo-600 " +
    "active:scale-[0.98] transition-all text-sm";

  const secondaryBtn =
    "relative inline-flex items-center gap-2 h-10 px-5 rounded-full " +
    "bg-neutral-100 border border-neutral-200 text-neutral-700 hover:bg-neutral-200 " +
    "dark:bg-white/5 dark:backdrop-blur dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20 " +
    "active:scale-[0.98] transition-all text-sm font-medium";

  return (
    <div className="relative w-full overflow-x-hidden pb-32 bg-white dark:bg-transparent transition-colors">
      <div className="p-3 md:p-6 pb-48 flex flex-col gap-6 md:gap-10">

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
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </>
            ) : (
              <>
                <button onClick={() => router.push("/login")} className={secondaryBtn}>Login</button>
                <button onClick={() => router.push("/signup")} className={primaryBtn}>Sign up</button>
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </>
            )
          )}
        </div>

        {/* Search bar — full width on mobile, centred on desktop */}
        <div className="w-full md:max-w-md md:mx-auto">
          <SearchBar tracks={allTracks} />
        </div>

        {/* Desktop buttons — original absolute position */}
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
                <ThemeToggle />
              </>
            ) : (
              <>
                <button onClick={() => router.push("/login")} className={secondaryBtn}>Login</button>
                <button onClick={() => router.push("/signup")} className={primaryBtn}>Sign up</button>
                <ThemeToggle />
              </>
            )
          )}
        </div>

        {/* ── People — moved to the very top of the feed ── */}
        <ArtistCarousel title="Artists" artists={artists} />

        {/* ── Discover (public) ── */}
        <HeroPlaylistCarousel title="Hot Playlists" playlists={shuffledHotPlaylists} />
        <ChartCarousel title="Trending" tracks={shuffledTrending} />

        {/* ── Yours (personal) ── */}
        {shuffledYourPlaylists.length > 0 && (
          <ShelfPlaylistCarousel title="Your Playlists" playlists={shuffledYourPlaylists} />
        )}
        {shuffledYourTracks.length > 0 && (
          <VinylCarousel title="Your taste" tracks={shuffledYourTracks} />
        )}
      </div>
    </div>
  );
}