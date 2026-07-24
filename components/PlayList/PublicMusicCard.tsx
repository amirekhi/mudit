"use client";

import { Track, useAudioStore } from "@/store/useAudioStore";
import { motion } from "framer-motion";
import PlayButton from "../explorerUi/PlayButton";
import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";

interface PublicMusicCardProps {
  track: Track;
}

export default function PublicMusicCard({ track }: PublicMusicCardProps) {
  const playTrack    = useAudioStore(s => s.playTrack);
  const togglePlay   = useAudioStore(s => s.togglePlay);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isActive     = currentTrack?._id === track._id;

  return (
    <motion.div
      whileHover={{ scale: 1.07 }}
      onClick={() => { if (isActive) togglePlay(); else playTrack(track); }}
      className="group relative w-72 min-w-[280px] h-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-2xl p-4
        flex flex-col justify-between cursor-pointer shadow-xl hover:shadow-2xl transition-colors
        max-md:w-60 max-md:min-w-[240px] max-md:h-64 max-md:p-3"
    >
      <div>
        <img
          src={track.image || "/test.jpg"}
          width={280}
          height={160}
          alt={track.title}
          className="object-cover h-40 w-full bg-neutral-200 dark:bg-neutral-700 rounded-xl mb-3 max-md:h-32"
        />
        <h3 className="text-neutral-900 dark:text-white font-semibold truncate text-lg max-md:text-base">{track.title}</h3>
        <p className="text-neutral-500 dark:text-gray-400 text-sm truncate max-md:text-xs">{track.artist}</p>
      </div>

      <div className="absolute bottom-4 right-4 max-md:bottom-2 max-md:right-2 max-md:scale-90">
        <PlayButton track={track} />
      </div>

      <Link
        href={`/tracks/${track._id}`}
        onClick={e => e.stopPropagation()}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 dark:bg-black/50 text-neutral-200 dark:text-neutral-400
          hover:text-white opacity-0 group-hover:opacity-100 transition-all"
      >
        <IconExternalLink className="w-3.5 h-3.5" />
      </Link>
    </motion.div>
  );
}