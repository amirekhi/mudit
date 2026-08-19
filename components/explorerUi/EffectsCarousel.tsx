"use client";

import { useRef } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Track } from "@/store/useAudioStore";
import EffectPadCard from "./EffectPadCard";
import SectionHeader from "@/components/basics/SectionHeader";

interface Props {
  title: string;
  tracks: Track[];
}

export default function EffectsCarousel({ tracks, title }: Props) {
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
        className="absolute top-[60%] left-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
          rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30
          dark:hover:bg-neutral-900/50 transition-colors z-20"
      >
        <IconChevronLeft className="w-5 h-5 text-black dark:text-white" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute top-[60%] right-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
          rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30
          dark:hover:bg-neutral-900/50 transition-colors z-20"
      >
        <IconChevronRight className="w-5 h-5 text-black dark:text-white" />
      </button>

      {/* Reusing the "discover" accent to match SectionHeader's existing
          variants — the pad cards themselves (amber, always-dark) are what
          carry this section's distinct identity, not the header. */}
      <SectionHeader eyebrow="Soundboard" title={title} accent="discover" />

      <div
        ref={containerRef}
        className="flex gap-3 py-4 overflow-x-auto scroll-smooth snap-x snap-proximity px-8 pr-16 md:touch-pan-x hide-scrollbar"
      >
        {tracks.map((track, i) => (
          <EffectPadCard key={track._id} track={track} index={i} />
        ))}
      </div>
    </div>
  );
}