"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import PublicPlaylistCard from "./PublicPlaylistCard";
import { Playlist } from "./PlaylistCard";

interface PublicPlaylistCarouselProps {
  title?: string;
  playlists: Playlist[];
}

export default function PublicPlaylistCarousel({ playlists, title }: PublicPlaylistCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const cardWidth = 288; // matches min-w-[18rem] w-72
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
      {/* Arrows */}
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

      {title && <h2 className="px-8 p-3 text-2xl font-bold">{title}</h2>}

      <div
        ref={containerRef}
        className="flex gap-4 py-4 overflow-x-auto scroll-smooth snap-x snap-proximity px-8 pr-16 touch-pan-x hide-scrollbar"
      >
        {playlists.map((playlist) => (
          <PublicPlaylistCard key={playlist._id} playlist={playlist} />
        ))}

     

      </div>
    </div>
  );
}
