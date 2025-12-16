"use client";
import { motion } from "framer-motion";
import { Track, useAudioStore } from "@/store/useAudioStore";
import Image from "next/image";
import PlayButton from "./PlayButton";

interface MusicCardProps {
  track: Track;
}

export default function MusicCard({ track }: MusicCardProps) {

  


  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="relative w-60 min-w-[240px] h-60 bg-neutral-900 rounded-xl p-4 flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-2xl"
    >
      <div>
        <img
          src={track.image || "/test.jpg"}
          width={240}
          height={144}
          alt={track.title}
          className="object-cover h-36 w-full bg-neutral-700 rounded-lg mb-2"
        />
        <h3 className="text-white font-semibold truncate">{track.title}</h3>
        <p className="text-gray-400 text-sm truncate">{track.artist}</p>
      </div>

      
      <div className="absolute bottom-4 right-4">
        <PlayButton track={track} />
      </div>
    </motion.div>
  );
}
