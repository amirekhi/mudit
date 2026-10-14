"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useTimelineStore } from "@/store/useTimelineStore";
import { useTimelinePps } from "@/lib/hooks/useTimeline";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * The horizontal scrollbar for the whole timeline, pinned to the bottom of the editor.
 * Drag the thumb, click the track to jump, or use the mouse wheel over it. The small red mark
 * shows where the playhead is in the whole project, even when it is scrolled out of view.
 *
 * `inset` is the same horizontal padding the timeline area uses, so the track lines up with it.
 */
export default function TimelineScrollbar({
  referenceLength,
  inset = "px-6",
}: {
  referenceLength: number;
  inset?: string;
}) {
  const pps = useTimelinePps(referenceLength);

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const ppsRef = useRef(pps);
  ppsRef.current = pps;
  const refLenRef = useRef(referenceLength);
  refLenRef.current = referenceLength;

  const geometry = useRef({ trackW: 0, thumbW: 0, maxScroll: 0 });
  const drag = useRef<{ startX: number; startScroll: number } | null>(null);

  const placeHead = useCallback(() => {
    const head = headRef.current;
    if (!head) return;
    const { trackW } = geometry.current;
    const time = useEditorStore.getState().transport.time;
    const x = clamp((time / Math.max(refLenRef.current, 1)) * trackW, 0, trackW);
    head.style.transform = `translateX(${x}px)`;
  }, []);

  // Sizes and positions the thumb. Written straight to the DOM: scrolling never re-renders React.
  const layout = useCallback(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const timeline = useTimelineStore.getState();
    const viewW = timeline.viewportWidth;
    const contentW = Math.max(refLenRef.current, 1) * ppsRef.current;
    const trackW = track.clientWidth;
    const maxScroll = Math.max(0, contentW - viewW);
    const canScroll = maxScroll > 1;

    const thumbW = canScroll ? clamp((trackW * viewW) / contentW, 32, trackW) : trackW;
    const ratio = canScroll ? clamp(timeline.scrollLeft / maxScroll, 0, 1) : 0;

    thumb.style.width = `${thumbW}px`;
    thumb.style.transform = `translateX(${(trackW - thumbW) * ratio}px)`;
    thumb.style.opacity = canScroll ? "1" : "0.35";
    thumb.style.cursor = canScroll ? "grab" : "default";

    geometry.current = { trackW, thumbW, maxScroll };
    placeHead();
  }, [placeHead]);

  useEffect(() => {
    layout();

    const unsubTimeline = useTimelineStore.subscribe((state, prev) => {
      if (
        state.scrollLeft !== prev.scrollLeft ||
        state.viewportWidth !== prev.viewportWidth ||
        state.pxPerSecond !== prev.pxPerSecond ||
        state.fit !== prev.fit
      ) {
        layout();
      }
    });
    const unsubTime = useEditorStore.subscribe((state, prev) => {
      if (state.transport.time !== prev.transport.time) placeHead();
    });

    const observer = new ResizeObserver(layout);
    if (trackRef.current) observer.observe(trackRef.current);

    return () => {
      unsubTimeline();
      unsubTime();
      observer.disconnect();
    };
  }, [layout, placeHead, pps, referenceLength]);

  const scrollTo = (left: number) => {
    const { maxScroll } = geometry.current;
    useTimelineStore.getState().setScroll(Math.round(clamp(left, 0, maxScroll)), "scrollbar");
  };

  const onThumbDown = (e: React.PointerEvent) => {
    if (geometry.current.maxScroll <= 1) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startScroll: useTimelineStore.getState().scrollLeft };
    if (thumbRef.current) thumbRef.current.style.cursor = "grabbing";
  };

  const onThumbMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { trackW, thumbW, maxScroll } = geometry.current;
    const free = trackW - thumbW;
    if (free <= 0) return;
    scrollTo(d.startScroll + (e.clientX - d.startX) * (maxScroll / free));
  };

  const onThumbUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (thumbRef.current) thumbRef.current.style.cursor = "grab";
  };

  // Clicking the empty track centres the thumb on the click
  const onTrackDown = (e: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const { trackW, thumbW, maxScroll } = geometry.current;
    const free = trackW - thumbW;
    if (maxScroll <= 1 || free <= 0) return;
    const x = e.clientX - track.getBoundingClientRect().left;
    scrollTo(clamp((x - thumbW / 2) / free, 0, 1) * maxScroll);
  };

  const onWheel = (e: React.WheelEvent) => {
    scrollTo(useTimelineStore.getState().scrollLeft + (e.deltaX || e.deltaY));
  };

  return (
    <div className={`flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 ${inset}`}>
      <div
        ref={trackRef}
        onPointerDown={onTrackDown}
        onWheel={onWheel}
        className="relative mx-px h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 cursor-pointer select-none touch-none"
        role="scrollbar"
        aria-orientation="horizontal"
        aria-label="Timeline scroll"
      >
        <div
          ref={thumbRef}
          onPointerDown={onThumbDown}
          onPointerMove={onThumbMove}
          onPointerUp={onThumbUp}
          onPointerCancel={onThumbUp}
          className="absolute left-0 top-0 h-full rounded-full bg-neutral-400 dark:bg-neutral-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 active:bg-indigo-500 transition-colors"
        />
        <div
          ref={headRef}
          className="pointer-events-none absolute -top-0.5 -bottom-0.5 left-0 w-0.5 rounded bg-red-500"
        />
      </div>
    </div>
  );
}
