"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";
import PublicMusicCard from "@/components/PlayList/PublicMusicCard";
import PublicPlaylistCard from "@/components/PlayList/PublicPlaylistCard";
import { Track } from "@/store/useAudioStore";
import { Playlist } from "@/components/PlayList/PlaylistCard";

interface ArtistInfo {
  name: string;
  image: string | null;
  fanCount: number;
  albumCount: number;
}

interface ArtistDetail {
  artist: ArtistInfo;
  tracks: Track[];
  playlists: Playlist[];
}

// Cards in a grid must fill their own cell. Some cards are sized for the home
// carousels (a fixed width), which on a phone is wider than a grid cell and
// makes neighbouring cards overlap. These classes make every card take exactly
// the width of its cell, whatever size the card was designed for.
const FIT_CELL = "[&>*]:!w-full [&>*]:!min-w-0 [&>*]:!max-w-full";

export default function ArtistDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery<ArtistDetail>({
    queryKey: ["artist", slug],
    queryFn: async () => {
      const res = await fetch(`/api/artists/${slug}`);
      if (!res.ok) throw new Error("Artist not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        Artist not found.
      </div>
    );
  }

  const { artist, tracks, playlists } = data;

  return (
    <div className="min-h-full overflow-x-hidden bg-white dark:bg-transparent transition-colors">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-32 flex flex-col gap-8">

        <div className="flex items-center justify-between">
          <BackButton />
          <ThemeToggle />
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-40 h-40 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex-shrink-0">
            {artist.image ? (
              <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-semibold text-neutral-400">
                {artist.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-center sm:text-left min-w-0">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white break-words">{artist.name}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {artist.fanCount.toLocaleString()} fans · {artist.albumCount} albums on Deezer
            </p>
          </div>
        </div>

        {tracks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Tracks</h2>
            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 ${FIT_CELL}`}>
              {tracks.map(track => (
                <PublicMusicCard key={track._id} track={track} />
              ))}
            </div>
          </div>
        )}

        {playlists.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Featured in playlists</h2>
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 ${FIT_CELL}`}>
              {playlists.map(playlist => (
                <PublicPlaylistCard key={playlist._id} playlist={playlist} />
              ))}
            </div>
          </div>
        )}

        {tracks.length === 0 && playlists.length === 0 && (
          <p className="text-neutral-500 text-center py-16">Nothing public from this artist yet.</p>
        )}
      </div>
    </div>
  );
}