"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import { Slate } from "@/types/slateTypes";
import Playhead from "@/components/editor/Playhead";

interface Props {
  slate: Slate;
  pxPerSecond: number;
}

export default function SlateRow({ slate, pxPerSecond }: Props) {
  const library = useEditorStore(s => s.library);
  const removeSlate = useEditorStore(s => s.removeSlate);
  const removeRegion = useEditorStore(s => s.removeRegion);
  const toggleSlateMute = useEditorStore(s => s.toggleSlateMute);
  const setSlateGain = useEditorStore(s => s.setSlateGain);
  const setSlateLength = useEditorStore(s => s.setSlateLength);
  const selectRegion = useEditorStore(s => s.selectRegion);
  const selectSlate = useEditorStore(s => s.selectSlate);
  const selectedRegionId = useEditorStore(s => s.selectedRegionId);
  const seek = useEditorStore(s => s.seek);
  const clipboard = useEditorStore(s => s.clipboard);
  const pasteRegion = useEditorStore(s => s.pasteRegion);

  const playSlate = useEngineStore(s => s.playSlate);

  const width = Math.max(slate.length * pxPerSecond, 4);

  const trackTitle = (trackId: string) => library.find(t => t._id === trackId)?.title ?? "Unknown";

  const handlePasteHere = () => {
    const time = useEditorStore.getState().transport.time;
    pasteRegion(slate.id, time);
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{slate.name}</span>

        <div className="flex items-center gap-2">
          <button onClick={() => playSlate(slate.id)} className="px-2 py-1 text-xs rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200">
            Play
          </button>

          {clipboard && (
            <button onClick={handlePasteHere} className="px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white">
              Paste at Playhead
            </button>
          )}

          <label className="flex items-center gap-1 text-xs text-neutral-500">
            Length
            <input
              type="number"
              min={0}
              step={0.5}
              value={slate.length}
              onChange={e => setSlateLength(slate.id, Number(e.target.value))}
              className="w-16 px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200"
            />
            s
          </label>

          <button
            onClick={() => toggleSlateMute(slate.id)}
            className={`px-2 py-1 text-xs rounded border ${
              slate.muted
                ? "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-300"
                : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200"
            }`}
          >
            {slate.muted ? "Muted" : "Mute"}
          </button>

          <input
            type="range"
            min={-24}
            max={12}
            step={0.5}
            value={slate.gain}
            onChange={e => setSlateGain(slate.id, Number(e.target.value))}
            className="w-20 accent-indigo-500"
          />

          <button onClick={() => removeSlate(slate.id)} className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-300">
            Delete Slate
          </button>
        </div>
      </div>

      <div
        className="relative h-14 rounded bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-hidden cursor-pointer"
        style={{ width }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          seek(Math.max(0, x / pxPerSecond));
          selectSlate(slate.id);
        }}
      >
        {slate.regions.map(region => {
          const isSelected = region.id === selectedRegionId;
          return (
            <div
              key={region.id}
              onClick={e => {
                e.stopPropagation();
                selectSlate(slate.id);
                selectRegion(region.id);
              }}
              className={`absolute top-1 bottom-1 rounded border flex items-center px-2 group ${
                isSelected ? "bg-indigo-500/70 border-indigo-300" : "bg-indigo-600/40 border-indigo-400/30"
              }`}
              style={{
                left: region.start * pxPerSecond,
                width: Math.max((region.end - region.start) * pxPerSecond, 4),
              }}
              title={`${region.clips.length} clip(s): ${region.clips.map(c => trackTitle(c.sourceTrackId)).join(", ")}`}
            >
              <span className="text-[10px] truncate text-indigo-50">
                {region.clips.length > 1 ? `${region.clips.length} clips` : trackTitle(region.clips[0]?.sourceTrackId ?? "")}
              </span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  removeRegion(slate.id, region.id);
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-red-500 dark:text-red-300 px-1"
              >
                ✕
              </button>
            </div>
          );
        })}

        <Playhead referenceLength={0} />
      </div>
    </div>
  );
}