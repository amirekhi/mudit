"use client";

import Link from "next/link";
import { IconSparkles } from "@tabler/icons-react";
import { PERIODS } from "@/lib/recs/periods";
import { playlistPath } from "@/lib/recs/links";
import type { MadeForYouPlaylist } from "@/lib/TanStackQuery/Queries/forYou";
import { timeAgo } from "./timeAgo";

export default function TastePlaylistCard({ playlist }: { playlist: MadeForYouPlaylist }) {
  const badge = PERIODS.find(p => p.id === playlist.kind)?.badge ?? "Mix";
  const details = [
    playlist.tasteName,
    `${playlist.trackCount} songs`,
    timeAgo(playlist.generatedAt),
  ].filter(Boolean).join(" · ");

  return (
    <Link
      href={playlistPath(playlist._id)}
      prefetch={false}
      className="group relative flex-shrink-0 w-44 md:w-48 snap-start"
      draggable={false}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/10 shadow-md
        bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-sky-500/20">
        {playlist.image ? (
          <img src={playlist.image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <IconSparkles className="w-10 h-10 text-indigo-500/70" />
          </div>
        )}

        <span className="absolute top-2 left-2 rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>

        {/* Always visible on touch screens, appears on hover with a mouse */}
        <span
          className="absolute bottom-2 right-2 h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg
            transition md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white truncate">{playlist.title}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{details}</p>
    </Link>
  );
}