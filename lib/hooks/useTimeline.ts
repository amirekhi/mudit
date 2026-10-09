"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useTimelineStore } from "@/store/useTimelineStore";
import { resolvePps } from "@/util/timeline";

/** Pixels per second for the current zoom, for a timeline `referenceLength` seconds long. */
export function useTimelinePps(referenceLength: number): number {
  const fit = useTimelineStore(s => s.fit);
  const pxPerSecond = useTimelineStore(s => s.pxPerSecond);
  const viewportWidth = useTimelineStore(s => s.viewportWidth);
  return resolvePps({ fit, pxPerSecond, viewportWidth }, referenceLength);
}

/**
 * Keeps this scroll container's horizontal position in sync with every other timeline view
 * (the other slates and the ruler). Scroll writes go through the store, never through React state.
 */
export function useTimelineScrollSync(ref: RefObject<HTMLElement | null>, pps: number) {
  const idRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = idRef.current;

    el.scrollLeft = useTimelineStore.getState().scrollLeft;

    const onScroll = () => useTimelineStore.getState().setScroll(el.scrollLeft, id);
    el.addEventListener("scroll", onScroll, { passive: true });

    const unsubscribe = useTimelineStore.subscribe((state, prev) => {
      if (state.scrollLeft === prev.scrollLeft || state.scrollSource === id) return;
      if (Math.abs(el.scrollLeft - state.scrollLeft) > 0.5) el.scrollLeft = state.scrollLeft;
    });

    return () => {
      el.removeEventListener("scroll", onScroll);
      unsubscribe();
    };
  }, [ref]);

  // After a zoom the content gets wider/narrower: apply the stored scroll position again
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = useTimelineStore.getState().scrollLeft;
  }, [ref, pps]);
}
