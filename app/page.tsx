"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import HeroPlaylistCarousel from "@/components/PlayList/HeroPlaylistCarousel";
import ShelfPlaylistCarousel from "@/components/PlayList/ShelfPlaylistCarousel";
import ChartCarousel from "@/components/explorerUi/ChartCarousel";
import VinylCarousel from "@/components/explorerUi/VinylCarousel";
import EffectsCarousel from "@/components/explorerUi/EffectsCarousel";
import ArtistCarousel from "@/components/artists/ArtistCarousel";
import EndOfFeed from "@/components/basics/EndOfFeed";
import SearchBar from "@/components/basics/SearchBar";
import HeaderActions from "@/components/basics/HeaderActions";
import CarouselSkeleton from "@/components/basics/CarouselSkeleton";
import MusicVideoCarousel from "@/components/explorerUi/MusicVideoCarousel";

import { Track } from "@/store/useAudioStore";
import { Playlist } from "@/components/PlayList/PlaylistCard";
import { fetchPublicTracksPage } from "@/lib/TanStackQuery/Queries/fetchPublicTracksPage";
import { fetchPublicPlaylistsPage } from "@/lib/TanStackQuery/Queries/fetchPublicPlaylistsPage";
import { fetchArtistsPage } from "@/lib/TanStackQuery/Queries/fetchArtistsPage";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import {
  fetchTelegramEffectsPage,
  telegramResultToTrack,
} from "@/lib/TanStackQuery/Queries/fetchTelegramEffects";
import { shuffleArray } from "@/util/shuffle";

// How many items each home carousel shows. The rest live on the "See all" pages.
const HOME_ARTISTS_LIMIT = 20;
const HOME_TRACKS_LIMIT = 20;
const HOME_PLAYLISTS_LIMIT = 12;
const HOME_EFFECTS_LIMIT = 12;

export default function Home() {
  const { data: user } = useCurrentUser();

  // Public playlists — ONE page, not every public playlist with all its tracks.
  const { data: playlistsPage, isLoading: publicPlaylistsLoading } =
    useQuery({
      queryKey: ["playlists", "public", "home", HOME_PLAYLISTS_LIMIT],
      queryFn: () => fetchPublicPlaylistsPage({ page: 1, pageSize: HOME_PLAYLISTS_LIMIT }),
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

  // Public tracks — ONE page (newest first), not every public track.
  const { data: tracksPage, isLoading: tracksLoading } =
    useQuery({
      queryKey: ["tracks", "public", "home", HOME_TRACKS_LIMIT],
      queryFn: () => fetchPublicTracksPage({ page: 1, pageSize: HOME_TRACKS_LIMIT }),
    });

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

  // Artists — ONE page (most followed first), not every artist.
  const { data: artistsPage, isLoading: artistsLoading } =
    useQuery({
      queryKey: ["artists", "home", HOME_ARTISTS_LIMIT],
      queryFn: async () => {
        try {
          return await fetchArtistsPage({ page: 1, pageSize: HOME_ARTISTS_LIMIT });
        } catch { return null; }
      },
    });

  // Telegram effects — ONE small page (newest first), not the whole index.
  const { data: effectsPage, isLoading: telegramEffectsLoading } =
    useQuery({
      queryKey: ["telegram-effects", "home", HOME_EFFECTS_LIMIT],
      queryFn: async () => {
        try {
          const result = await fetchTelegramEffectsPage({ page: 1, pageSize: HOME_EFFECTS_LIMIT });
          return { tracks: result.items.map(telegramResultToTrack), total: result.total };
        } catch { return { tracks: [] as Track[], total: 0 }; }
      },
    });

  const artists = useMemo(() => artistsPage?.items ?? [], [artistsPage]);
  const tracks = useMemo(() => tracksPage?.items ?? [], [tracksPage]);
  const publicPlaylists = useMemo(() => playlistsPage?.items ?? [], [playlistsPage]);
  const telegramEffects = effectsPage?.tracks ?? [];

  // "See all" only shows when there's actually more than the carousel holds.
  const moreArtists = (artistsPage?.total ?? 0) > artists.length;
  const moreTracks = (tracksPage?.total ?? 0) > tracks.length;
  const morePlaylists = (playlistsPage?.total ?? 0) > publicPlaylists.length;
  const moreEffects = (effectsPage?.total ?? 0) > telegramEffects.length;

  // Shuffled once per fetch (not on every re-render) so the order within the
  // carousel varies between visits. Trending is deliberately NOT shuffled:
  // each of its cards shows a rank number, which only means something if the
  // list keeps its order.
  const shuffledHotPlaylists = useMemo(() => shuffleArray(publicPlaylists), [publicPlaylists]);
  const shuffledYourPlaylists = useMemo(() => shuffleArray(userPlaylists), [userPlaylists]);
  const shuffledYourTracks = useMemo(() => shuffleArray(userTracks), [userTracks]);

  // The page renders immediately; each section shows a skeleton until its own
  // data arrives, instead of one full-screen spinner waiting on everything.
  // "Yours" sections only get a skeleton for signed-in users, so guests don't
  // see one flash and vanish.
  return (
    <div className="relative w-full overflow-x-hidden pb-6 bg-white dark:bg-transparent transition-colors">
      <div className="p-3 md:p-6 pb-6 flex flex-col gap-6 md:gap-10">

        {/* Mobile-only button row */}
        <HeaderActions className="flex items-center gap-2 md:hidden" toggleClassName="ml-auto" />

        {/* Search bar — full width on mobile, centred on desktop.
            Only the user's own tracks are passed in; public tracks are
            searched on the server as you type. */}
        <div className="w-full md:max-w-md md:mx-auto">
          <SearchBar tracks={userTracks} />
        </div>

        {/* Desktop buttons — original absolute position */}
        <HeaderActions className="hidden md:flex absolute top-6 right-6 items-center gap-3 z-50" />

        {/* ── People — moved to the very top of the feed ── */}
        {artistsLoading
          ? <CarouselSkeleton cardClassName="w-24 h-24 rounded-full" />
          : <ArtistCarousel
              title="Artists"
              artists={artists}
              seeAllHref={moreArtists ? "/artists" : undefined}
            />}

        {/* ── Discover (public) ── */}
        {publicPlaylistsLoading
          ? <CarouselSkeleton cardClassName="w-64 h-40 rounded-2xl" />
          : <HeroPlaylistCarousel
              title="Hot Playlists"
              playlists={shuffledHotPlaylists}
              seeAllHref={morePlaylists ? "/hot-playlists" : undefined}
            />}

        {tracksLoading
          ? <CarouselSkeleton cardClassName="w-[320px] max-md:w-[260px] h-24 rounded-2xl" />
          : <ChartCarousel
              title="Trending"
              tracks={tracks}
              seeAllHref={moreTracks ? "/trending" : undefined}
            />}

        {/* ── Effects (Telegram-sourced soundboard) ── */}
        {!telegramEffectsLoading && telegramEffects.length > 0 && (
          <EffectsCarousel
            title="Telegram Channel"
            tracks={telegramEffects}
            seeAllHref={moreEffects ? "/effects" : undefined}
          />
        )}

        {/* ── Yours (personal) ── */}
        {user && userPlaylistsLoading
          ? <CarouselSkeleton cardClassName="w-44 h-44 rounded-2xl" />
          : shuffledYourPlaylists.length > 0 && (
              <ShelfPlaylistCarousel title="Your Playlists" playlists={shuffledYourPlaylists} />
            )}

        {user && userTracksLoading
          ? <CarouselSkeleton cardClassName="w-40 h-40 rounded-full" />
          : shuffledYourTracks.length > 0 && (
              <VinylCarousel title="Your taste" tracks={shuffledYourTracks} />
            )}

        <MusicVideoCarousel title="Music Videos" />
        <EndOfFeed />
      </div>
    </div>
  );
}
