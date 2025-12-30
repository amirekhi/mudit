"use client";

import { useEditorStore } from "@/store/useEditorStore";

export default function ToolPanel({ disabled }: { disabled: boolean }) {
  const {
    selectedTrackId,
    selectedRegionId,
    updateRegion,
  } = useEditorStore();

  const applyGain = (value: number) => {
    console.log(selectedRegionId, selectedTrackId)
    if (!selectedTrackId || !selectedRegionId) return;

    updateRegion(selectedTrackId, selectedRegionId, {
      edits: { gain: value },
    } as any);
  };

  return (
    <aside className="w-64 border-l border-neutral-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold">Tools</h3>

      <button
  
        onClick={() => applyGain(3)}
        className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm"
      >
        +3 dB Gain
      </button>

      <button
   
        onClick={() => applyGain(-3)}
        className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm"
      >
        −3 dB Gain
      </button>
    </aside>
  );
}
