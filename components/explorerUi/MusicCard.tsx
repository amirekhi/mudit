"use client";

import { motion } from "framer-motion";
import { Track, useAudioStore } from "@/store/useAudioStore";
import PlayButton from "./PlayButton";
import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";

interface MusicCardProps {
  track: Track;
}

export default function MusicCard({ track }: MusicCardProps) {
  const playTrack  = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying  = useAudioStore(s => s.isPlaying);

  const isActive = currentTrack?._id === track._id;

  const handleCardClick = () => {
    if (isActive) togglePlay();
    else playTrack(track);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      onClick={handleCardClick}
      className="relative w-60 min-w-[240px] h-60 bg-neutral-900 rounded-xl p-4 flex flex-col
        justify-between cursor-pointer shadow-lg hover:shadow-2xl
        max-md:w-44 max-md:min-w-[180px] max-md:h-48 max-md:p-2"
    >
      <div>
        <img
          src={track.image || "/test.jpg"}
          width={240}
          height={144}
          alt={track.title}
          className="object-cover h-36 w-full bg-neutral-700 rounded-lg mb-2 max-md:h-28"
        />
        <h3 className="text-white font-semibold truncate max-md:text-sm">{track.title}</h3>
        <p className="text-gray-400 text-sm truncate max-md:text-xs">{track.artist}</p>
      </div>

      {/* Play button */}
      <div className="absolute bottom-4 right-4 max-md:bottom-2 max-md:right-2 max-md:scale-90">
        <PlayButton track={track} />
      </div>

      {/* View link — stops propagation so it doesn't also trigger play */}
      <Link
        href={`/tracks/${track._id}`}
        onClick={e => e.stopPropagation()}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-neutral-400
          hover:text-white hover:bg-black/70 opacity-0 group-hover:opacity-100
          transition-all"
      >
        <IconExternalLink className="w-3.5 h-3.5" />
      </Link>
    </motion.div>
  );
}