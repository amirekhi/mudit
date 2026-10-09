"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";

/**
 * The red playhead line. It moves by writing to the DOM directly, so playback doesn't re-render React.
 * Pass `pxPerSecond` for the zoomable timeline (position in pixels), or `referenceLength` for the
 * old percentage layout.
 */
export default function Playhead({
  referenceLength,
  pxPerSecond,
}: {
  referenceLength?: number;
  pxPerSecond?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (time: number) => {
      const el = ref.current;
      if (!el) return;
      if (pxPerSecond) {
        el.style.left = `${time * pxPerSecond}px`;
      } else {
        const safeRef = Math.max(referenceLength ?? 0, 0.0001);
        el.style.left = `${Math.min(100, Math.max(0, (time / safeRef) * 100))}%`;
      }
    };

    apply(useEditorStore.getState().transport.time);

    return useEditorStore.subscribe((state, prev) => {
      if (state.transport.time !== prev.transport.time) apply(state.transport.time);
    });
  }, [referenceLength, pxPerSecond]);

  return (
    <div
      ref={ref}
      className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-20"
      style={{ left: "0%" }}
    />
  );
}
