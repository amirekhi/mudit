"use client";

import { useRef } from "react";
import { Playlist } from "./PlaylistCard";
import PlaylistCard from "./PlaylistCard";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

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

      <h2 className="px-8 p-3 text-2xl font-bold">{title}</h2>

      <div
        ref={containerRef}
        className="flex gap-4 py-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-8 touch-pan-x hide-scrollbar"
      >
        {playlists.map((pl) => (
          <PlaylistCard key={pl._id} playlist={pl} />
        ))}
      </div>
    </div>
  );
}
