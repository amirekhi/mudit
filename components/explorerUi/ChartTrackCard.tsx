"use client";

import { Track, useAudioStore } from "@/store/useAudioStore";
import PlayButton from "./PlayButton";
import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";

interface Props {
  track: Track;
  rank: number;
}

export default function ChartTrackCard({ track, rank }: Props) {
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isActive = currentTrack?._id === track._id;

  return (
    <div
      onClick={() => { if (isActive) togglePlay(); else playTrack(track); }}
      className="group relative flex-shrink-0 w-[320px] max-md:w-[260px] h-24 flex items-center gap-4 pl-2 pr-4
        rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-transparent
        shadow-md hover:shadow-xl cursor-pointer overflow-hidden transition-shadow"
    >
      {/* Ghost rank number — the countdown motif that makes this row read as "Charts" */}
      <span
        aria-hidden
        className="absolute -left-2 -bottom-3 text-7xl font-black italic select-none pointer-events-none
          text-neutral-900/[0.06] dark:text-white/[0.06]"
      >
        {rank}
      </span>

      <img
        src={track.image || "/test.jpg"}
        alt={track.title}
        className="relative z-10 w-16 h-16 rounded-xl object-cover bg-neutral-200 dark:bg-neutral-700 flex-shrink-0"
      />

      <div className="relative z-10 flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{track.title}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{track.artist}</p>
      </div>

      <div className="relative z-10 flex items-center gap-1 flex-shrink-0">
        <Link
          href={`/tracks/${track._id}`}
          onClick={e => e.stopPropagation()}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white
            hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <IconExternalLink className="w-3.5 h-3.5" />
        </Link>
        <div onClick={e => e.stopPropagation()}>
          <PlayButton track={track} />
        </div>
      </div>
    </div>
  );
}