"use client";

import { useRef } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import ArtistCarouselCard, { ArtistSummary } from "./ArtistCarouselCard";
import SectionHeader from "@/components/basics/SectionHeader";

interface ArtistCarouselProps {
  title?: string;
  artists: ArtistSummary[];
}

export default function ArtistCarousel({ artists, title }: ArtistCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    const scrollAmount = containerRef.current.clientWidth * 0.8;
    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (artists.length === 0) return null;

  return (
    <div className="relative w-full">
      <button
        onClick={() => scroll("left")}
        className="absolute top-[62%] left-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
                   rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30
                   dark:hover:bg-neutral-900/50 transition-colors z-10"
      >
        <IconChevronLeft className="w-5 h-5 text-black dark:text-white" />
      </button>

      <button
        onClick={() => scroll("right")}
        className="absolute top-[62%] right-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
                   rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30
                   dark:hover:bg-neutral-900/50 transition-colors z-10"
      >
        <IconChevronRight className="w-5 h-5 text-black dark:text-white" />
      </button>

      {title && <SectionHeader eyebrow="People" title={title} accent="people" />}

      <div
        ref={containerRef}
        className="flex gap-5 py-4 overflow-x-auto scroll-smooth snap-x snap-proximity px-8 md:touch-pan-x hide-scrollbar"
      >
        {artists.map(artist => (
          <ArtistCarouselCard key={artist.slug} artist={artist} />
        ))}
      </div>
    </div>
  );
}