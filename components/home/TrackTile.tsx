"use client";

import Link from "next/link";
import { useAudioStore } from "@/store/useAudioStore";
import type { HomeTrack } from "@/lib/TanStackQuery/Queries/forYou";
import { timeAgo } from "./timeAgo";

export default function TrackTile({ track }: { track: HomeTrack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const isCurrent = useAudioStore(s => s.currentTrack?._id === track._id);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const active = isCurrent && isPlaying;

  return (
    <div className="group flex-shrink-0 w-36 md:w-40 snap-start">
      <button
        type="button"
        onClick={() => (isCurrent ? togglePlay() : playTrack(track))}
        aria-label={active ? `Pause ${track.title}` : `Play ${track.title}`}
        className="relative block w-full aspect-square rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800
          border border-neutral-200 dark:border-white/10 shadow-md"
      >
        <img
          src={track.image || "/test.jpg"}
          alt=""
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span
          className={`absolute inset-0 items-center justify-center bg-black/45 ${
            active ? "flex" : "hidden group-hover:flex"
          }`}
        >
          {active ? (
            <span className="flex gap-0.5 items-end h-4">
              <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          ) : (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </span>
      </button>

      <Link
        href={`/tracks/${track._id}`}
        prefetch={false}
        draggable={false}
        className="mt-2 block text-sm font-medium text-neutral-900 dark:text-white truncate hover:underline"
      >
        {track.title}
      </Link>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
        {track.artist}
        {track.lastPlayedAt ? ` · ${timeAgo(track.lastPlayedAt)}` : ""}
      </p>
    </div>
  );
}