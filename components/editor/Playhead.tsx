"use client";

import { useEditorStore } from "@/store/useEditorStore";

export default function Playhead({ referenceLength }: { referenceLength: number }) {
  const time = useEditorStore(s => s.transport.time);
  const safeRef = Math.max(referenceLength, 0.0001);
  const percent = Math.min(100, Math.max(0, (time / safeRef) * 100));

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-20"
      style={{ left: `${percent}%` }}
    />
  );
}