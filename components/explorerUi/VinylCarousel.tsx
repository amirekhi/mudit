"use client";

import { useRef } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Track } from "@/store/useAudioStore";
import VinylTrackCard from "./VinylTrackCard";
import SectionHeader from "@/components/basics/SectionHeader";

interface Props {
  title: string;
  tracks: Track[];
}

export default function VinylCarousel({ tracks, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    const amount = containerRef.current.clientWidth * 0.8;
    containerRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (tracks.length === 0) return null;

  return (
    <div className="relative w-full">
      <button
        onClick={() => scroll("left")}
        className="absolute top-[45%] left-2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
          rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30
          dark:hover:bg-neutral-900/50 transition-colors z-20"
      >
        <IconChevronLeft className="w-4 h-4 text-black dark:text-white" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute top-[45%] right-2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
          rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30
          dark:hover:bg-neutral-900/50 transition-colors z-20"
      >
        <IconChevronRight className="w-4 h-4 text-black dark:text-white" />
      </button>

      <SectionHeader eyebrow="Yours" title={title} accent="yours" />

      <div
        ref={containerRef}
        className="flex gap-5 py-4 overflow-x-auto scroll-smooth snap-x snap-proximity px-8 pr-14 md:touch-pan-x hide-scrollbar"
      >
        {tracks.map(track => (
          <VinylTrackCard key={track._id} track={track} />
        ))}
      </div>
    </div>
  );
}