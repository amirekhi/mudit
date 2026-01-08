"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { Track } from "@/store/useAudioStore";
import MusicCard from "./MusicCard";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import Link from "next/link";

interface MusicCarouselProps {
  title?: string;
  tracks: Track[];
}

export default function MusicCarousel({ tracks, title }: MusicCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    const scrollAmount = containerRef.current.clientWidth * 0.8;
    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full">
      {/* Left Arrow */}
      <button
        onClick={() => scroll("left")}
        className="absolute top-1/2 left-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center 
                   rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30 
                   dark:hover:bg-neutral-900/50 transition-colors z-10"
      >
        <IconChevronLeft className="w-5 h-5 text-black dark:text-white" />
      </button>

      {/* Right Arrow */}
      <button
        onClick={() => scroll("right")}
        className="absolute top-1/2 right-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center 
                   rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30 
                   dark:hover:bg-neutral-900/50 transition-colors z-10"
      >
        <IconChevronRight className="w-5 h-5 text-black dark:text-white" />
      </button>

      {/* Title */}
      {title && <h2 className="px-8 p-3 text-2xl font-bold max-md:text-xl">{title}</h2>}

      {/* Carousel container */}
      <div
        ref={containerRef}
        className="flex gap-4 py-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-8 touch-pan-x hide-scrollbar
                   max-md:items-start"
      >
        {/* ADD TRACK CARD */}
        <Link href="/createSong">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex-shrink-0 w-60 min-w-[240px] h-60 max-md:w-44 max-md:min-w-[180px] max-md:h-48
                       bg-neutral-900 rounded-xl p-4 flex flex-col justify-center items-center cursor-pointer
                       shadow-lg hover:shadow-2xl border-2 border-dashed border-neutral-700 hover:border-white
                       text-neutral-500 hover:text-white transition-colors"
          >
            <IconPlus className="w-12 h-12 max-md:w-8 max-md:h-8 mb-2" />
            <span className="text-center font-semibold max-md:text-sm">Add Track</span>
          </motion.div>
        </Link>

        {/* Music Cards */}
        {tracks.map((track) => (
          <MusicCard key={track._id} track={track} />
        ))}
      </div>
    </div>
  );
}
