"use client";

import { useRef } from "react";
import { dummyTracks } from "@/Data/Tracks"; // your dummy data
import { Track, useAudioStore } from "@/store/useAudioStore";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import MusicCard from "./MusicCard";

interface MusicCarouselProps {
  title? : String
  tracks: Track[];
}

export default function MusicCarousel({ tracks  , title }: MusicCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
    const {
      currentTrack,
      isPlaying,
      volume,
      nextTrack,
      prevTrack,
      playTrack,
      unload,
      togglePlay,
      setVolume,
    } = useAudioStore();

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;

    const scrollAmount = containerRef.current.clientWidth * 0.8; // scroll 80% of visible width
    if (direction === "left") containerRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    else containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

    function onCardClick(track: Track) {
        playTrack(track);
    }

  return (
    <div className="relative w-full">
      {/* Left Arrow */}
        
        <button
        onClick={() => scroll("left")}
        className="absolute top-1/2 left-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50 transition-colors z-10"
        >
        <IconChevronLeft className="w-5 h-5 text-black dark:text-white" />
        </button>

       
        <button
        onClick={() => scroll("right")}
        className="absolute top-1/2 right-2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50 transition-colors z-10"
        >
        <IconChevronRight className="w-5 h-5 text-black dark:text-white" />
        </button>

        <h2 className="px-8 p-3 text-2xl font-bold" >{title}</h2>

        <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-8 touch-pan-x hide-scrollbar"
      >
        {tracks.map((track) => (
          <MusicCard
            key={track.id}
            track={track}
            onClick={() => onCardClick?.(track)}
          />
        ))}
      </div>
    </div>
  );
}
