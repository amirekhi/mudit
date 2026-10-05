"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import type { Region } from "wavesurfer.js/dist/plugins/regions";

import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import { Slate, SlateRegion } from "@/types/slateTypes";
import Playhead from "@/components/editor/Playhead";

interface Props {
  slateId: string;
  referenceLength: number;
}

interface DragState {
  id: string;
  pointerId: number;
  startClientX: number;
  originalStart: number;
  liveStart: number;
}

/**
 * Outer shell: only looks the slate up. All the other hooks live in the inner component,
 * so there is no early return in the middle of a component's hooks any more.
 */
export default function SlateEditor({ slateId, referenceLength }: Props) {
  const slate = useEditorStore(s => s.slates.find(x => x.id === slateId));
  if (!slate) return null;
  return <SlateEditorInner slate={slate} referenceLength={referenceLength} />;
}

/**
 * The "Time" field is its own tiny component: it is the only part of the slate row that has to
 * follow the playhead, so the rest of the row no longer re-renders on every animation frame.
 */
function TimeField() {
  const time = useEditorStore(s => s.transport.time);
  return (
    <label className="flex items-center gap-1 text-[10px] text-neutral-500 whitespace-nowrap">
      Time
      <input
        type="number" min={0} step={0.1}
        value={Number(time.toFixed(2))}
        onChange={e => useEngineStore.getState().seekTo(Number(e.target.value) || 0)}
        className="w-16 px-1 py-1 rounded bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs"
      />
      s
    </label>
  );
}

function SlateEditorInner({ slate, referenceLength }: { slate: Slate; referenceLength: number }) {
  const rowRef       = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef        = useRef<WaveSurfer | null>(null);
  const regionsRef   = useRef<RegionsPlugin | null>(null);
  const selectionRef = useRef<Region | null>(null);

  const [isReady,       setIsReady]       = useState(false);
  const [selection,     setSelection]     = useState<{ start: number; end: number } | null>(null);
  const [targetSlateId, setTargetSlateId] = useState<string>("");
  const [dragState,     setDragState]     = useState<DragState | null>(null);

  // Subscribed state (changes on edits, never on playback ticks)
  const library          = useEditorStore(s => s.library);
  const slates           = useEditorStore(s => s.slates);
  const selectedRegionId = useEditorStore(s => s.selectedRegionId);
  const clipboard        = useEditorStore(s => s.clipboard);
  const isPlaying        = useEngineStore(s => s.isPlaying);
  const currentSlateIds  = useEngineStore(s => s.currentSlateIds);

  // Actions are stable references, so reading them with getState() does not subscribe to anything
  const {
    selectSlate, selectRegion, removeRegion, removeSlate, lockRegion, moveRegion,
    createRegionFromSelection, pasteRegion, setSlateLength, setSlateGain, toggleSlateMute,
  } = useEditorStore.getState();
  const {
    playSlate, pause: pauseEngine, reset: resetEngine, seekTo, compileSlatePreview,
  } = useEngineStore.getState();

  // Includes every edit that changes what the waveform should look like
  const regionsSignature = slate.regions
    .map(r =>
      `${r.id}:${r.start.toFixed(4)}:${r.end.toFixed(4)}:${r.clips
        .map(c => {
          const e = c.edits;
          return `${c.id}:${c.offset.toFixed(4)}:${c.sourceStart.toFixed(4)}:${c.sourceEnd.toFixed(4)}:${e.playbackRate ?? 1}:${e.gain ?? 0}:${e.pan ?? 0}:${e.fadeIn ?? 0}:${e.fadeOut ?? 0}:${e.reverse ? 1 : 0}:${e.mute ? 1 : 0}`;
        })
        .join("|")}`
    )
    .join(",");

  useEffect(() => {
    compileSlatePreview(slate.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionsSignature, slate.id, slate.length, slate.gain, slate.pan]);

  const sourceTrack   = slate.sourceTrackId ? library.find(t => t._id === slate.sourceTrackId) : null;
  const projectSlates = slates.filter(s => s.kind === "project");
  const safeReference = Math.max(referenceLength, 1);
  const waveformPercent = Math.min(100, (slate.length / safeReference) * 100);
  const isCurrent     = currentSlateIds.includes(slate.id);
  const isPlayingHere = isCurrent && isPlaying;
  const trackTitle    = (id: string) => library.find(t => t._id === id)?.title ?? "Unknown";

  /* WaveSurfer init: used for VISUALS ONLY (silent, no media). All audio goes through the engine. */
  useEffect(() => {
    if (!containerRef.current) return;
    let ws: WaveSurfer | null = null;
    let regions: RegionsPlugin | null = null;
    let cancelled = false;

    const init = async () => {
      containerRef.current!.innerHTML = "";
      setIsReady(false);
      regions = RegionsPlugin.create();
      ws = WaveSurfer.create({
        container: containerRef.current!,
        waveColor: "#9ca3af", progressColor: "#6366f1",
        cursorColor: "#6366f1", cursorWidth: 0,
        height: 120, normalize: true, interact: true,
        plugins: [regions],
      });
      wsRef.current = ws;
      regionsRef.current = regions;

      try {
        // Peaks only: no media url, so WaveSurfer never downloads the audio a second time
        if (slate.regions.length === 0) {
          await ws.load("", [[0, 0]], slate.length || 1);
        } else if (slate.previewPeaks) {
          await ws.load("", [Array.from(slate.previewPeaks)], slate.length || 1);
        } else if (slate.kind === "single" && slate.peaks) {
          await ws.load("", [slate.peaks], slate.length);
        } else {
          await ws.load("", [[0, 0]], slate.length || 1);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        return;
      }
      if (cancelled) return;
      ws.setVolume(0);
      setIsReady(true);
    };

    init();
    return () => {
      cancelled = true;
      try { ws?.destroy(); } catch {}
      wsRef.current = null;
      regionsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slate.id, slate.kind]);

  /* Waveform data reload */
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !isReady) return;
    let cancelled = false;
    const reload = async () => {
      try {
        if (slate.regions.length === 0) {
          await ws.load("", [[0, 0]], slate.length || 1);
        } else if (slate.previewPeaks) {
          await ws.load("", [Array.from(slate.previewPeaks)], slate.length || 1);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
      if (cancelled) return;
      ws.setVolume(0);
    };
    reload();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slate.previewPeaks, slate.regions.length]);

  /* Drag handlers */
  const handleRegionPointerDown = (e: React.PointerEvent, region: SlateRegion) => {
    e.stopPropagation();
    selectSlate(slate.id);
    selectRegion(region.id);
    if (region.meta.locked || selection) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ id: region.id, pointerId: e.pointerId, startClientX: e.clientX, originalStart: region.start, liveStart: region.start });
  };
  const handleRegionPointerMove = (e: React.PointerEvent) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const rowWidth = rowRef.current?.getBoundingClientRect().width ?? 0;
    if (!rowWidth) return;
    const delta = (e.clientX - dragState.startClientX) / (rowWidth / safeReference);
    setDragState(d => d ? { ...d, liveStart: Math.max(0, d.originalStart + delta) } : d);
  };
  const handleRegionPointerUp = (e: React.PointerEvent) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    if (dragState.liveStart !== dragState.originalStart) moveRegion(slate.id, dragState.id, dragState.liveStart);
    setDragState(null);
  };

  /* Selection */
  const startSelectionMode = () => {
    const ws = wsRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;
    selectSlate(slate.id);
    selectionRef.current?.remove();
    const duration = ws.getDuration() || slate.length;
    const end = Math.min(duration, 5);
    const ghost = regions.addRegion({ id: "__selection__", start: 0, end, drag: true, resize: true, color: "rgba(34,197,94,0.35)" });
    ghost.on("update-end", () => setSelection({ start: ghost.start, end: ghost.end }));
    selectionRef.current = ghost;
    setSelection({ start: 0, end });
  };
  const cancelSelection = () => {
    selectionRef.current?.remove();
    selectionRef.current = null;
    setSelection(null);
  };
  const confirmSelection = () => {
    if (!selection) return;
    createRegionFromSelection(slate.id, selection.start, selection.end, targetSlateId || slate.id, selection.start);
    cancelSelection();
  };

  // Seeking now works while playing: playback continues from the clicked position
  const handleRowClick = (e: React.MouseEvent) => {
    selectSlate(slate.id);
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    seekTo(Math.max(0, ((e.clientX - rect.left) / rect.width) * safeReference));
  };

  const selectedRegion = slate.regions.find(r => r.id === selectedRegionId);

  /* Shared button style */
  const cb = "px-2.5 py-1.5 text-xs rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 whitespace-nowrap transition-colors";

  return (
    <div className={`border rounded-lg transition-colors ${
      isPlayingHere ? "border-emerald-500 bg-emerald-500/10"
      : isCurrent   ? "border-emerald-600/50 dark:border-emerald-700/50 bg-emerald-500/5"
      :                "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/30"
    }`}>

      {/* ── Name + status row ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">{slate.name}</span>
          <span className="text-[10px] text-neutral-500 flex-shrink-0">
            {slate.kind === "single" ? "Source" : "Project"}
          </span>
          {isPlayingHere && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex-shrink-0">● Playing</span>}
          {isCurrent && !isPlaying && <span className="text-[10px] text-emerald-700 dark:text-emerald-600 flex-shrink-0">● Paused</span>}
        </div>
        <button
          onClick={() => removeSlate(slate.id)}
          className="text-[10px] px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 flex-shrink-0"
        >
          Delete Slate
        </button>
      </div>

      {/* ── Scrollable controls row ── */}
      <div className="overflow-x-auto px-3 pb-2">
        <div className="flex items-center gap-1.5 w-max">

          {/* Transport */}
          <button onClick={() => { selectSlate(slate.id); playSlate(slate.id); }} className="px-2.5 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white whitespace-nowrap">
            ▶ Play
          </button>
          <button onClick={pauseEngine}  className={cb}>⏸ Pause</button>
          <button onClick={resetEngine}  className={cb}>↺ Reset</button>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 flex-shrink-0" />

          {/* Length */}
          <label className="flex items-center gap-1 text-[10px] text-neutral-500 whitespace-nowrap">
            Length
            <input
              type="number" min={0} step={0.5}
              value={slate.length}
              onChange={e => setSlateLength(slate.id, Number(e.target.value) || 0)}
              className="w-14 px-1 py-1 rounded bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs"
            />
            s
          </label>

          {/* Time (own component: follows the playhead) */}
          <TimeField />

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 flex-shrink-0" />

          {/* Slate mixer: these existed in the engine but had no controls */}
          <button
            onClick={() => toggleSlateMute(slate.id)}
            className={`px-2.5 py-1.5 text-xs rounded border whitespace-nowrap transition-colors ${
              slate.muted
                ? "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-300"
                : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {slate.muted ? "Muted" : "Mute"}
          </button>
          <label className="flex items-center gap-1 text-[10px] text-neutral-500 whitespace-nowrap">
            Gain
            <input
              type="range" min={-24} max={12} step={0.5}
              value={slate.gain}
              onChange={e => setSlateGain(slate.id, Number(e.target.value))}
              className="w-20 accent-indigo-500"
            />
            <span className="w-14 text-right">{slate.gain > 0 ? "+" : ""}{slate.gain.toFixed(1)} dB</span>
          </label>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 flex-shrink-0" />

          {/* Clipboard */}
          {clipboard && (
            <button
              onClick={() => { selectSlate(slate.id); pasteRegion(slate.id, useEditorStore.getState().transport.time); }}
              className="px-2.5 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white whitespace-nowrap"
            >
              Paste
            </button>
          )}

          {/* Selection */}
          {!selection ? (
            <button onClick={startSelectionMode} className="px-2.5 py-1.5 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap">
              + Selection
            </button>
          ) : (
            <>
              <select
                value={targetSlateId}
                onChange={e => setTargetSlateId(e.target.value)}
                className="px-2 py-1.5 text-xs rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 max-w-[120px]"
              >
                <option value="">This slate</option>
                {projectSlates.filter(s => s.id !== slate.id).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button onClick={confirmSelection} className="px-2.5 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white whitespace-nowrap">
                ✓ Confirm
              </button>
              <button onClick={cancelSelection} className={cb}>✕ Cancel</button>
            </>
          )}

          {/* Selected region actions */}
          {selectedRegion && (
            <>
              <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 flex-shrink-0" />
              <button
                onClick={() => lockRegion(slate.id, selectedRegion.id, !selectedRegion.meta.locked)}
                className={cb}
              >
                {selectedRegion.meta.locked ? "Unlock" : "Lock"}
              </button>
              <button
                onClick={() => removeRegion(slate.id, selectedRegion.id)}
                className="px-2.5 py-1.5 text-xs rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-300 whitespace-nowrap"
              >
                Delete Region
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Waveform + region overlay ── */}
      <div
        ref={rowRef}
        onClick={handleRowClick}
        className="relative w-full h-[80px] md:h-[120px] bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 overflow-hidden cursor-pointer rounded-b-lg"
      >
        <div
          className={`absolute top-0 left-0 h-full ${selection ? "z-30" : "z-0"}`}
          style={{ width: `${waveformPercent}%` }}
        >
          <div ref={containerRef} className="w-full h-full" />
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none">
          {slate.regions.map(region => {
            const isDragging  = dragState?.id === region.id;
            const start       = isDragging ? dragState!.liveStart : region.start;
            const duration    = region.end - region.start;
            const leftPct     = (start / safeReference) * 100;
            const widthPct    = Math.max((duration / safeReference) * 100, 0.3);
            const isSelected  = region.id === selectedRegionId;

            const colorClass = region.meta.locked
              ? "bg-red-500/30 border-red-400/50"
              : isSelected
              ? "bg-indigo-500/70 border-indigo-300"
              : region.status === "edited"
              ? "bg-indigo-600/55 border-indigo-400/50"
              : "bg-indigo-600/40 border-indigo-400/40";

            return (
              <div
                key={region.id}
                onPointerDown={e => handleRegionPointerDown(e, region)}
                onPointerMove={handleRegionPointerMove}
                onPointerUp={handleRegionPointerUp}
                className={`absolute top-0 bottom-0 rounded border flex items-center px-1 overflow-hidden
                  ${colorClass}
                  ${region.meta.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
                  ${selection ? "pointer-events-none" : "pointer-events-auto"}`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={`${region.clips.length} clip(s)`}
              >
                <span className="text-[9px] truncate text-indigo-50 select-none">
                  {region.clips.length > 1
                    ? `${region.clips.length} clips`
                    : trackTitle(region.clips[0]?.sourceTrackId ?? "")}
                </span>
              </div>
            );
          })}
        </div>

        <Playhead referenceLength={safeReference} />
      </div>
    </div>
  );
}
