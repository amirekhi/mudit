"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Track } from "@/store/useAudioStore";
import { useAudioStore } from "@/store/useAudioStore";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { fetchTrackById } from "@/lib/TanStackQuery/Queries/fetchTrackById";
import {
  fetchTelegramEffect,
  telegramResultToTrack,
  TELEGRAM_ID_PREFIX,
} from "@/lib/TanStackQuery/Queries/fetchTelegramEffects";
import {
  IconArrowLeft, IconLock, IconWorld, IconMusic, IconBolt,
  IconPlayerPlay, IconPlayerPause, IconPlayerSkipBack, IconPlayerSkipForward,
  IconEdit, IconCalendar, IconClock,
} from "@tabler/icons-react";
import Link from "next/link";
import ThemeToggle from "@/components/basics/ThemeToggle";
import LyricsView from "@/components/lyrics/LyricsView";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function TrackDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying    = useAudioStore(s => s.isPlaying);
  const playTrack    = useAudioStore(s => s.playTrack);
  const togglePlay   = useAudioStore(s => s.togglePlay);

  // Telegram effects use ids like "telegram-<shortId>" and live in a
  // different backend, so they get their own lookup.
  const isTelegram = id.startsWith(TELEGRAM_ID_PREFIX);

  // Only used for prev/next, which walks the user's own tracks. Shared cache
  // key with the home page, so it's usually already loaded.
  const { data: userTracks = [] } = useQuery<Track[], Error>({
    queryKey: ["user-tracks"],
    queryFn: async () => {
      try {
        const res = await authFetch("/api/tracks/me");
        if (!res.ok) throw new Error();
        return res.json();
      } catch { return []; }
    },
  });

  // ONE track by id (the server applies public/private visibility), instead
  // of downloading every public track and .find()-ing this one.
  const { data: fetchedTrack, isLoading: trackLoading } = useQuery<Track | null, Error>({
    queryKey: ["track", id],
    enabled: !isTelegram,
    queryFn: () => fetchTrackById(id),
  });

  const { data: telegramTrack, isLoading: telegramLoading } = useQuery<Track | null, Error>({
    queryKey: ["telegram-effect", id],
    enabled: isTelegram,
    queryFn: async () => {
      const result = await fetchTelegramEffect(id.slice(TELEGRAM_ID_PREFIX.length));
      return result ? telegramResultToTrack(result) : null;
    },
  });

  const track = (isTelegram ? telegramTrack : fetchedTrack) ?? undefined;
  const isLoading = isTelegram ? telegramLoading : trackLoading;
  const isActive = currentTrack?._id === id;

  // Effects aren't part of any ordered list, so no prev/next for them.
  const userIdx   = isTelegram ? -1 : userTracks.findIndex(t => t._id === id);
  const prevTrack = userIdx > 0 ? userTracks[userIdx - 1] : null;
  const nextTrack = userIdx >= 0 && userIdx < userTracks.length - 1 ? userTracks[userIdx + 1] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
          <IconMusic className="w-7 h-7 text-neutral-400 dark:text-neutral-700" />
        </div>
        <p className="text-neutral-700 dark:text-neutral-300 font-medium">Track not found</p>
        <button onClick={() => router.back()} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
          ← Go back
        </button>
      </div>
    );
  }

  // Lyrics lookup needs a real artist. Effects without one would otherwise
  // query LRCLIB with "Unknown Artist" and just return nothing useful.
  const showLyrics = !isTelegram || track.artist !== "Unknown Artist";

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

        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
          <div className="w-full sm:w-56 flex-shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-black/10 dark:shadow-black/50">
              {track.image ? (
                <img src={track.image} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <IconMusic className="w-16 h-16 text-neutral-300 dark:text-neutral-700" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isTelegram ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <IconBolt className="w-3 h-3" />Effect
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    track.visibility === "public"
                      ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                  }`}>
                    {track.visibility === "public"
                      ? <><IconWorld className="w-3 h-3" />Public</>
                      : <><IconLock className="w-3 h-3" />Private</>
                    }
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white leading-tight">{track.title}</h1>
              <p className="text-lg text-neutral-500 dark:text-neutral-400 mt-1">{track.artist}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isTelegram && (
                prevTrack ? (
                  <Link href={`/tracks/${prevTrack._id}`}>
                    <button
                      onClick={() => playTrack(prevTrack)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <IconPlayerSkipBack className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                    </button>
                  </Link>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center opacity-30 cursor-not-allowed">
                    <IconPlayerSkipBack className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                  </div>
                )
              )}

              <button
                onClick={() => { if (isActive) togglePlay(); else playTrack(track); }}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
              >
                {isActive && isPlaying
                  ? <IconPlayerPause className="w-6 h-6 text-white" />
                  : <IconPlayerPlay className="w-6 h-6 text-white" />
                }
              </button>

              {!isTelegram && (
                nextTrack ? (
                  <Link href={`/tracks/${nextTrack._id}`}>
                    <button
                      onClick={() => playTrack(nextTrack)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <IconPlayerSkipForward className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                    </button>
                  </Link>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center opacity-30 cursor-not-allowed">
                    <IconPlayerSkipForward className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                  </div>
                )
              )}

              {/* Passes track ID so the edit page auto-selects it.
                  Hidden for effects — there's no editable DB record. */}
              {!isTelegram && (
                <Link
                  href={`/edit/updateTrack?id=${track._id}`}
                  className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <IconEdit className="w-3.5 h-3.5" />
                  Edit
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 divide-y divide-neutral-200 dark:divide-neutral-800">
          <div className="px-5 py-4">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-neutral-500 mb-0.5">Title</dt>
                <dd className="text-sm text-neutral-900 dark:text-white font-medium">{track.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 mb-0.5">Artist</dt>
                <dd className="text-sm text-neutral-900 dark:text-white font-medium">{track.artist}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 mb-0.5">{isTelegram ? "Source" : "Visibility"}</dt>
                <dd className="text-sm text-neutral-900 dark:text-white font-medium capitalize">
                  {isTelegram ? "Telegram channel" : track.visibility}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 mb-0.5">Track ID</dt>
                <dd className="text-xs text-neutral-400 dark:text-neutral-600 font-mono break-all">{track._id}</dd>
              </div>
            </dl>
          </div>

          <div className="px-5 py-4">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Timestamps</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <IconCalendar className="w-4 h-4 text-neutral-400 dark:text-neutral-600 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-neutral-500">Added</dt>
                  <dd className="text-sm text-neutral-900 dark:text-white">{formatDate(track.createdAt)}</dd>
                </div>
              </div>
              {/* Effects only have an added date, so "Last updated" would
                  always just repeat it. */}
              {!isTelegram && (
                <div className="flex items-center gap-2">
                  <IconClock className="w-4 h-4 text-neutral-400 dark:text-neutral-600 flex-shrink-0" />
                  <div>
                    <dt className="text-xs text-neutral-500">Last updated</dt>
                    <dd className="text-sm text-neutral-900 dark:text-white">{formatDate(track.updatedAt)}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>

        {showLyrics && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-5 py-4">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Lyrics</h2>
            <LyricsView trackId={track._id} title={track.title} artist={track.artist} />
          </div>
        )}

      </div>
    </div>
  );
}
