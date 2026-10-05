"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";

/**
 * Moves the red line by writing to the DOM directly, so playback no longer
 * re-renders React 60 times a second.
 */
export default function Playhead({ referenceLength }: { referenceLength: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const safeRef = Math.max(referenceLength, 0.0001);

    const apply = (time: number) => {
      const el = ref.current;
      if (!el) return;
      const percent = Math.min(100, Math.max(0, (time / safeRef) * 100));
      el.style.left = `${percent}%`;
    };

    apply(useEditorStore.getState().transport.time);

    return useEditorStore.subscribe((state, prev) => {
      if (state.transport.time !== prev.transport.time) apply(state.transport.time);
    });
  }, [referenceLength]);

  return (
    <div
      ref={ref}
      className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-20"
      style={{ left: "0%" }}
    />
  );
}
