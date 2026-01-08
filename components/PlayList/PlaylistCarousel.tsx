"use client";

import { useRef } from "react";
import Link from "next/link";
import PlaylistCard, { Playlist } from "./PlaylistCard";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";

interface PlaylistCarouselProps {
  title?: string;
  playlists: Playlist[];
}

export default function PlaylistCarousel({ title, playlists }: PlaylistCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    const amount = containerRef.current.clientWidth * 0.8;
    containerRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full">
      {/* Arrows */}
      <button
        onClick={() => scroll("left")}
        className="absolute top-1/2 left-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center 
                   rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30
                   dark:hover:bg-neutral-900/50 transition-colors z-10"
      >
        <IconChevronLeft className="w-5 h-5 text-black dark:text-white" />
      </button>

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
        {/* CREATE PLAYLIST CARD */}
        <Link
          href="/createPlaylist"
          className="shrink-0 w-[180px] h-[240px] max-md:w-[140px] max-md:h-[180px] rounded-xl
                     border-2 border-dashed border-neutral-400/50
                     flex flex-col items-center justify-center
                     text-neutral-500 hover:text-white hover:border-white transition-colors"
        >
          <IconPlus className="w-10 h-10 max-md:w-8 max-md:h-8 mb-2" />
          <span className="text-sm font-medium max-md:text-xs">Create Playlist</span>
        </Link>

        {/* Existing playlists */}
        {playlists.map((pl) => (
          <PlaylistCard key={pl._id} playlist={pl} />
        ))}
      </div>
    </div>
  );
}
