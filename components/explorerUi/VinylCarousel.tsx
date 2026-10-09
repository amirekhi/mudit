"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Track } from "@/store/useAudioStore";
import VinylTrackCard from "./VinylTrackCard";
import SectionHeader from "@/components/basics/SectionHeader";

interface Props {
  title: string;
  tracks: Track[];
  /** Where "See all" goes. Omit it and the link simply isn't rendered. */
  seeAllHref?: string;
}

// Fades the row's left/right edges so it's obvious there's more to scroll.
// A CSS mask rather than a gradient overlay, so it works on any background
// (including the transparent dark-mode one).
const FADE_MASK =
  "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%_-_2rem),transparent)]";

// Arrows hide on touch devices (they just cover cards there) and fade out
// when there's nothing left to scroll in their direction.
const ARROW =
  "absolute top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center z-20 " +
  "rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30 " +
  "dark:hover:bg-neutral-900/50 transition-opacity [@media(hover:none)]:hidden " +
  "disabled:opacity-0 disabled:pointer-events-none";

export default function VinylCarousel({ tracks, title, seeAllHref }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges, tracks.length]);

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  if (tracks.length === 0) return null;

  return (
    <div className="relative w-full">
      <div className="flex items-end">
        <div className="flex-1 min-w-0">
      <SectionHeader eyebrow="Yours" title={title} accent="yours" />

        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            prefetch={false}
            className="mr-8 mb-1 flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium
              text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            See all <IconChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Arrows live inside this wrapper (around the scroller only), so
          top-1/2 is always the middle of the card row regardless of header. */}
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
          className={`${ARROW} left-2`}
        >
          <IconChevronLeft className="w-4 h-4 text-black dark:text-white" />
        </button>
        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          aria-label="Scroll right"
          className={`${ARROW} right-2`}
        >
          <IconChevronRight className="w-4 h-4 text-black dark:text-white" />
        </button>

        <div
          ref={containerRef}
          onScroll={updateEdges}
          className={`flex gap-5 py-4 overflow-x-auto scroll-smooth motion-reduce:scroll-auto snap-x snap-proximity px-8 max-md:px-2 pr-14 md:touch-pan-x hide-scrollbar ${FADE_MASK}`}
        >
          {tracks.map(track => (
            <VinylTrackCard key={track._id} track={track} />
          ))}
        </div>
      </div>
    </div>
  );
}
