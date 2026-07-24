"use client";

import { motion } from "framer-motion";
import { Track } from "@/store/useAudioStore";
import PlayButton from "@/components/explorerUi/PlayButton";

interface Props {
  track: Track;
}

export default function SearchMusicCard({ track }: Props) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-xl p-3 flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-2xl transition-colors"
    >
      <div>
        <img
          src={track.image || "/test.jpg"}
          width={240}
          height={240}
          alt={track.title}
          className="object-cover aspect-square w-full bg-neutral-200 dark:bg-neutral-700 rounded-lg mb-2"
        />
        <h3 className="text-neutral-900 dark:text-white font-semibold truncate text-sm">{track.title}</h3>
        <p className="text-neutral-500 dark:text-gray-400 text-xs truncate">{track.artist}</p>
      </div>

      <div className="absolute bottom-3 right-3">
        <PlayButton track={track} />
      </div>
    </motion.div>
  );
}