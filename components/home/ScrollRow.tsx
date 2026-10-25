"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import SectionHeader from "@/components/basics/SectionHeader";
import { useDragScroll } from "@/hooks/useDragScroll";

interface Props {
  eyebrow: string;
  title: string;
  accent: ComponentProps<typeof SectionHeader>["accent"];
  seeAllHref?: string;
  /** Changes when the content changes, so the scroll arrows update. */
  itemCount: number;
  gapClassName?: string;
  children: ReactNode;
}

// Same look and behaviour as the other home carousels (edge fade, arrows that
// hide on touch, drag with the mouse). One shared shell for the new sections
// instead of another copy of the same scroll code.
const FADE_MASK =
  "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%_-_2rem),transparent)]";

const ARROW =
  "absolute top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center z-20 " +
  "rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 dark:bg-neutral-900/30 " +
  "dark:hover:bg-neutral-900/50 transition-opacity [@media(hover:none)]:hidden " +
  "disabled:opacity-0 disabled:pointer-events-none";

export default function ScrollRow({ eyebrow, title, accent, seeAllHref, itemCount, gapClassName = "gap-4", children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useDragScroll(containerRef);

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
  }, [updateEdges, itemCount]);

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <div className="relative w-full">
      <div className="flex items-end">
        <div className="flex-1 min-w-0">
          <SectionHeader eyebrow={eyebrow} title={title} accent={accent} />
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

      <div className="relative">
        <button onClick={() => scroll("left")} disabled={!canScrollLeft} aria-label="Scroll left" className={`${ARROW} left-2`}>
          <IconChevronLeft className="w-5 h-5 text-black dark:text-white" />
        </button>
        <button onClick={() => scroll("right")} disabled={!canScrollRight} aria-label="Scroll right" className={`${ARROW} right-2`}>
          <IconChevronRight className="w-5 h-5 text-black dark:text-white" />
        </button>

        <div
          ref={containerRef}
          onScroll={updateEdges}
          className={`flex ${gapClassName} py-4 cursor-grab overflow-x-auto scroll-smooth motion-reduce:scroll-auto snap-x snap-proximity px-8 max-md:px-2 pr-16 md:touch-pan-x hide-scrollbar ${FADE_MASK}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}