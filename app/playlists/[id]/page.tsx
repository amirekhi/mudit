"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft, IconArrowsShuffle, IconEdit, IconLock, IconMusic,
  IconPlayerPause, IconPlayerPlay, IconSparkles, IconWorld,
} from "@tabler/icons-react";
import ThemeToggle from "@/components/basics/ThemeToggle";
import { Spinner } from "@/components/basics/Spinner";
import ShareButton from "@/components/PlayList/ShareButton";
import { BUCKET_META } from "@/components/tastes/bucketMeta";
import { PERIODS } from "@/lib/recs/periods";
import { playQueue, shuffled } from "@/lib/recs/playback";
import { usePlaylistView, type PlaylistViewTrack } from "@/lib/TanStackQuery/Queries/playlistView";
import { useAudioStore } from "@/store/useAudioStore";

interface Props {
  params: Promise<{ id: string }>;
}

function TrackRow({
  track, index, active, playing, onPlay,
}: { track: PlaylistViewTrack; index: number; active: boolean; playing: boolean; onPlay: () => void }) {
  const bucket = track.bucket ? BUCKET_META[track.bucket] : null;

  return (
    <li
      className={`group flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        active
          ? "bg-indigo-600/10 border-indigo-500/30"
          : "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"
      }`}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={active && playing ? `Pause ${track.title}` : `Play ${track.title}`}
        className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 hover:bg-indigo-600 transition-colors"
      >
        {active && playing ? (
          <span className="flex gap-0.5 items-end h-3">
            <span className="w-0.5 h-3 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-0.5 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-0.5 h-3 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        ) : (
          <>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 group-hover:hidden">{index + 1}</span>
            <svg className="hidden group-hover:block w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </>
        )}
      </button>

      <img
        src={track.image || "/test.jpg"}
        alt=""
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-neutral-200 dark:bg-neutral-800"
      />

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${active ? "text-indigo-600 dark:text-indigo-300" : "text-neutral-900 dark:text-white"}`}>
          {track.title}
        </div>
        <div className="text-xs text-neutral-500 truncate">
          {track.artist}
          {track.reason ? ` · ${track.reason}` : ""}
        </div>
      </div>

      {bucket && (
        <span className={`hidden sm:inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${bucket.chip}`}>
          {bucket.short}
        </span>
      )}

      <Link
        href={`/tracks/${track._id}`}
        prefetch={false}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-neutral-500 dark:text-neutral-400
          hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
      >
        View
      </Link>
    </li>
  );
}

export default function PlaylistPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { data: playlist, isLoading, isError, error } = usePlaylistView(id);

  const currentTrackId = useAudioStore(s => s.currentTrack?._id ?? null);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const togglePlay = useAudioStore(s => s.togglePlay);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 h-full min-h-[50vh] text-neutral-500 text-sm">
        <Spinner size={16} /> Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-3">
        <p className="text-neutral-700 dark:text-neutral-300 font-medium">Couldn&apos;t load this playlist</p>
        <p className="text-sm text-neutral-500">{error.message}</p>
        <button onClick={() => router.back()} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
          ← Go back
        </button>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
          <IconMusic className="w-7 h-7 text-neutral-400 dark:text-neutral-700" />
        </div>
        <p className="text-neutral-700 dark:text-neutral-300 font-medium">Playlist not found</p>
        <button onClick={() => router.back()} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
          ← Go back
        </button>
      </div>
    );
  }

  const tracks = playlist.tracks;
  const playingFromHere = currentTrackId !== null && tracks.some(t => t._id === currentTrackId);
  const generated = playlist.generated;
  const madeLabel = generated
    ? generated.kind === "manual"
      ? "Made for you"
      : `Made for you · ${PERIODS.find(p => p.id === generated.kind)?.mixName ?? "Mix"}`
    : null;

  const playAll = () => {
    if (tracks.length === 0) return;
    if (playingFromHere) togglePlay();
    else playQueue(tracks, 0);
  };

  const playRow = (i: number) => {
    if (tracks[i]._id === currentTrackId) togglePlay();
    else playQueue(tracks, i);
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-white dark:bg-transparent transition-colors">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 pb-32 flex flex-col gap-8">

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors w-fit"
          >
            <IconArrowLeft className="w-4 h-4" />
            Back
          </button>
          <ThemeToggle />
        </div>

        {/* Hero */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
          <div className="w-full sm:w-56 flex-shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-black/10 dark:shadow-black/50">
              {playlist.image ? (
                <img src={playlist.image} alt={playlist.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-sky-500/10">
                  {generated ? <IconSparkles className="w-16 h-16 text-indigo-400/70" /> : <IconMusic className="w-16 h-16 text-neutral-300 dark:text-neutral-700" />}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {madeLabel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <IconSparkles className="w-3 h-3" />{madeLabel}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  playlist.visibility === "public"
                    ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                }`}>
                  {playlist.visibility === "public"
                    ? <><IconWorld className="w-3 h-3" />Public</>
                    : <><IconLock className="w-3 h-3" />Private</>}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white leading-tight break-words">{playlist.title}</h1>
              {playlist.description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">{playlist.description}</p>
              )}
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                {tracks.length} {tracks.length === 1 ? "song" : "songs"}
                {playlist.ownerName && !playlist.isOwner ? ` · by ${playlist.ownerName}` : ""}
                {generated?.tasteName && playlist.isOwner ? (
                  <>
                    {" · from "}
                    <Link href={`/tastes?id=${generated.tasteId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      {generated.tasteName}
                    </Link>
                  </>
                ) : null}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={playAll}
                disabled={tracks.length === 0}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium
                  shadow-lg shadow-indigo-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {playingFromHere && isPlaying
                  ? <><IconPlayerPause className="w-5 h-5" />Pause</>
                  : <><IconPlayerPlay className="w-5 h-5" />Play</>}
              </button>

              <button
                type="button"
                onClick={() => playQueue(shuffled(tracks), 0)}
                disabled={tracks.length < 2}
                title="Play in a random order"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700
                  text-sm font-medium text-neutral-700 dark:text-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IconArrowsShuffle className="w-4 h-4" />
                Shuffle
              </button>

              {playlist.isOwner && (
                <Link
                  href={`/edit/updatePlaylist/${playlist._id}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800
                    hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <IconEdit className="w-3.5 h-3.5" />
                  Edit
                </Link>
              )}
            </div>

            {playlist.isOwner && (
              <ShareButton playlistId={playlist._id} playlistVisibility={playlist.visibility} />
            )}
          </div>
        </div>

        {/* Songs */}
        {tracks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center">
            <p className="text-neutral-700 dark:text-neutral-300 font-medium">No songs yet</p>
            <p className="text-sm text-neutral-500 mt-1">
              {playlist.isOwner ? "Add some from the playlist editor." : "This playlist is empty."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tracks.map((t, i) => (
              <TrackRow
                key={t._id}
                track={t}
                index={i}
                active={currentTrackId === t._id}
                playing={isPlaying}
                onPlay={() => playRow(i)}
              />
            ))}
          </ul>
        )}

        {playlist.unavailable > 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
            {playlist.unavailable} {playlist.unavailable === 1 ? "song is" : "songs are"} no longer available.
          </p>
        )}
      </div>
    </div>
  );
}