"use client";

import { Track } from "@/store/useAudioStore";
import { motion } from "framer-motion";
import PlayButton from "../explorerUi/PlayButton";

interface PublicMusicCardProps {
  track: Track;
}

export default function PublicMusicCard({ track }: PublicMusicCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.07 }}
      className="relative w-72 min-w-[280px] h-72 bg-neutral-900 rounded-2xl p-4 flex flex-col justify-between cursor-pointer shadow-xl hover:shadow-2xl
                 max-md:w-60 max-md:min-w-[240px] max-md:h-64 max-md:p-3"
    >
      <div>
        <img
          src={track.image || "/test.jpg"}
          width={280}
          height={160}
          alt={track.title}
          className="object-cover h-40 w-full bg-neutral-700 rounded-xl mb-3 max-md:h-32"
        />
        <h3 className="text-white font-semibold truncate text-lg max-md:text-base">{track.title}</h3>
        <p className="text-gray-400 text-sm truncate max-md:text-xs">{track.artist}</p>
      </div>

      <div className="absolute bottom-4 right-4 max-md:bottom-2 max-md:right-2 max-md:scale-90">
        <PlayButton track={track} />
      </div>
    </motion.div>
  );
}
