"use client";
import { motion } from "framer-motion";
import { Track } from "@/store/useAudioStore";
import { IconPlayerPlay } from "@tabler/icons-react";
import Image from "next/image";

interface MusicCardProps {
  track: Track;
  onClick?: () => void;
}

export default function MusicCard({ track, onClick }: MusicCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="relative w-60 min-w-[240px] h-60 bg-neutral-900 rounded-xl p-4 flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-2xl"
      onClick={onClick}
    >
      <div>
        <Image src={track.image || "/default-image.jpg"} width={240} height={144} alt={track.title} className=" object-cover  h-36 w-full bg-neutral-700 rounded-lg  mb-2" />
        <h3 className="text-white font-semibold truncate">{track.title}</h3>
        <p className="text-gray-400 text-sm truncate">{track.artist}</p>
      </div>
      <button className="absolute bottom-4 right-4 p-3 rounded-full bg-indigo-500 hover:bg-indigo-600 transition-colors shadow-lg">
        <IconPlayerPlay className="w-5 h-5 text-white" />
      </button>
    </motion.div>
  );
}