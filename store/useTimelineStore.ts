"use client";

import { create } from "zustand";
import { resolvePps } from "@/util/timeline";

/**
 * View settings for the timeline. None of this is part of a project: it is how you look at it.
 */
interface TimelineState {
  fit: boolean;            // true: zoom so the whole project fits the width
  pxPerSecond: number;     // used when fit is false
  viewportWidth: number;   // measured by the ruler
  snapEnabled: boolean;
  bpm: number;
  division: number;        // grid lines per beat
  loop: boolean;
  follow: boolean;         // scroll along with the playhead while playing

  // Horizontal scroll is shared, so every slate and the ruler stay lined up
  scrollLeft: number;
  scrollSource: string;

  dropTargetSlateId: string | null; // highlighted while dragging a region towards another slate

  // The green selection of whichever slate has one. Loop and Space use it (see useEditorShortcuts).
  selectionRange: { slateId: string; start: number; end: number } | null;

  setViewportWidth(width: number): void;
  setFit(): void;
  zoomTo(pxPerSecond: number, referenceLength: number): void;
  zoomBy(factor: number, referenceLength: number): void;
  setSnapEnabled(enabled: boolean): void;
  setBpm(bpm: number): void;
  setDivision(division: number): void;
  toggleLoop(): void;
  setFollow(follow: boolean): void;
  setScroll(left: number, source: string): void;
  setDropTarget(slateId: string | null): void;
  setSelectionRange(range: { slateId: string; start: number; end: number } | null): void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  fit: true,
  pxPerSecond: 100,
  viewportWidth: 800,
  snapEnabled: false,
  bpm: 120,
  division: 1,
  loop: false,
  follow: true,

  scrollLeft: 0,
  scrollSource: "",
  dropTargetSlateId: null,
  selectionRange: null,

  setViewportWidth: (width) => {
    if (Math.abs(width - get().viewportWidth) > 1) set({ viewportWidth: width });
  },

  setFit: () => set({ fit: true, scrollLeft: 0, scrollSource: "zoom" }),

  // Zooms around the centre of the visible area, so what you are looking at stays put
  zoomTo: (pxPerSecond, referenceLength) => {
    const s = get();
    const current = resolvePps(s, referenceLength);
    const next = resolvePps({ fit: false, pxPerSecond, viewportWidth: s.viewportWidth }, referenceLength);
    const centreTime = (s.scrollLeft + s.viewportWidth / 2) / current;
    const scrollLeft = Math.max(0, centreTime * next - s.viewportWidth / 2);
    set({ fit: false, pxPerSecond: next, scrollLeft, scrollSource: "zoom" });
  },

  zoomBy: (factor, referenceLength) => {
    const current = resolvePps(get(), referenceLength);
    get().zoomTo(current * factor, referenceLength);
  },

  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setBpm: (bpm) => set({ bpm: Math.min(400, Math.max(20, bpm)) }),
  setDivision: (division) => set({ division }),
  toggleLoop: () => set(state => ({ loop: !state.loop })),
  setFollow: (follow) => set({ follow }),

  setScroll: (left, source) => {
    if (left === get().scrollLeft) return;
    set({ scrollLeft: left, scrollSource: source });
  },

  setDropTarget: (slateId) => {
    if (get().dropTargetSlateId !== slateId) set({ dropTargetSlateId: slateId });
  },

  setSelectionRange: (range) => set({ selectionRange: range }),
}));
