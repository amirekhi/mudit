"use client";

import { useRef } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import PublicMusicCard from "./PublicMusicCard";
import { Track } from "@/store/useAudioStore";

interface PublicMusicCarouselProps {
  title?: string;
  tracks: Track[];
}

export default function PublicMusicCarousel({ tracks, title }: PublicMusicCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const cardWidth = 560; // desktop card width
  const gap = 16;

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({
      left: direction === "left" ? -(cardWidth + gap) : cardWidth + gap,
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
        className="flex gap-4 py-4 overflow-x-auto scroll-smooth snap-x snap-proximity px-8 pr-16 touch-pan-x hide-scrollbar
                   max-md:items-start"
      >
        {tracks.map((track) => (
          <PublicMusicCard key={track._id} track={track} />
        ))}
      </div>
    </div>
  );
}
