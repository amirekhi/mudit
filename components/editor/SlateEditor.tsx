"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import type { Region } from "wavesurfer.js/dist/plugins/regions";

import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import { SlateRegion } from "@/types/slateTypes";
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

export default function SlateEditor({ slateId, referenceLength }: Props) {
  const rowRef       = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef        = useRef<WaveSurfer | null>(null);
  const regionsRef   = useRef<RegionsPlugin | null>(null);
  const selectionRef = useRef<Region | null>(null);

  const [isReady,       setIsReady]       = useState(false);
  const [selection,     setSelection]     = useState<{ start: number; end: number } | null>(null);
  const [targetSlateId, setTargetSlateId] = useState<string>("");
  const [dragState,     setDragState]     = useState<DragState | null>(null);

  const library         = useEditorStore(s => s.library);
  const slates          = useEditorStore(s => s.slates);
  const selectedRegionId = useEditorStore(s => s.selectedRegionId);
  const transportTime   = useEditorStore(s => s.transport.time);
  const clipboard       = useEditorStore(s => s.clipboard);

  const selectSlate             = useEditorStore(s => s.selectSlate);
  const selectRegion            = useEditorStore(s => s.selectRegion);
  const removeRegion            = useEditorStore(s => s.removeRegion);
  const removeSlate             = useEditorStore(s => s.removeSlate);
  const lockRegion              = useEditorStore(s => s.lockRegion);
  const moveRegion              = useEditorStore(s => s.moveRegion);
  const createRegionFromSelection = useEditorStore(s => s.createRegionFromSelection);
  const pasteRegion             = useEditorStore(s => s.pasteRegion);
  const setSlateLength          = useEditorStore(s => s.setSlateLength);
  const seek                    = useEditorStore(s => s.seek);

  const isPlaying       = useEngineStore(s => s.isPlaying);
  const currentSlateIds = useEngineStore(s => s.currentSlateIds);
  const playSlate       = useEngineStore(s => s.playSlate);
  const pauseEngine     = useEngineStore(s => s.pause);
  const resetEngine     = useEngineStore(s => s.reset);
  const compileSlatePreview = useEngineStore(s => s.compileSlatePreview);

  const slate = slates.find(s => s.id === slateId);

  const regionsSignature = slate
    ? slate.regions.map(r =>
        `${r.id}:${r.start.toFixed(4)}:${r.end.toFixed(4)}:${r.clips
          .map(c => `${c.id}:${c.offset.toFixed(4)}:${c.sourceStart.toFixed(4)}:${c.sourceEnd.toFixed(4)}:${c.edits.playbackRate ?? 1}`)
          .join("|")}`
      ).join(",")
    : "";

  useEffect(() => {
    if (slate) compileSlatePreview(slate.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionsSignature, slate?.id]);

  if (!slate) return null;

  const sourceTrack   = slate.sourceTrackId ? library.find(t => t._id === slate.sourceTrackId) : null;
  const projectSlates = slates.filter(s => s.kind === "project");
  const safeReference = Math.max(referenceLength, 1);
  const waveformPercent = Math.min(100, (slate.length / safeReference) * 100);
  const isCurrent     = currentSlateIds.includes(slate.id);
  const isPlayingHere = isCurrent && isPlaying;
  const trackTitle    = (id: string) => library.find(t => t._id === id)?.title ?? "Unknown";

  /* WaveSurfer init */
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
        waveColor: "#444", progressColor: "#6366f1",
        cursorColor: "#fff", cursorWidth: 0,
        height: 120, normalize: true, interact: true,
        plugins: [regions],
      });
      wsRef.current = ws;
      regionsRef.current = regions;

      try {
        if (slate.regions.length === 0) {
          await ws.load("", [[0, 0]], slate.length || 1);
        } else if (slate.previewPeaks) {
          await ws.load("", [Array.from(slate.previewPeaks)], slate.length || 1);
        } else if (slate.kind === "single" && sourceTrack && slate.peaks) {
          await ws.load(sourceTrack.url, [slate.peaks], slate.length);
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
  }, [slate.id, slate.kind, sourceTrack?.url]);

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

  const handleRowClick = (e: React.MouseEvent) => {
    selectSlate(slate.id);
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    seek(Math.max(0, ((e.clientX - rect.left) / rect.width) * safeReference));
  };

  const selectedRegion = slate.regions.find(r => r.id === selectedRegionId);

  /* Shared button style */
  const cb = "px-2.5 py-1.5 text-xs rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 whitespace-nowrap transition-colors";

  return (
    <div className={`border rounded-lg transition-colors ${
      isPlayingHere ? "border-emerald-500 bg-emerald-500/10"
      : isCurrent   ? "border-emerald-700/50 bg-emerald-500/5"
      :                "border-neutral-800 bg-neutral-900/30"
    }`}>

      {/* ── Name + status row ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-neutral-200 truncate">{slate.name}</span>
          <span className="text-[10px] text-neutral-500 flex-shrink-0">
            {slate.kind === "single" ? "Source" : "Project"}
          </span>
          {isPlayingHere && <span className="text-[10px] text-emerald-400 flex-shrink-0">● Playing</span>}
          {isCurrent && !isPlaying && <span className="text-[10px] text-emerald-600 flex-shrink-0">● Paused</span>}
        </div>
        <button
          onClick={() => removeSlate(slate.id)}
          className="text-[10px] px-2 py-1 rounded bg-red-900/40 border border-red-800 text-red-300 hover:bg-red-900/60 flex-shrink-0"
        >
          Delete Slate
        </button>
      </div>

      {/* ── Scrollable controls row ── */}
      <div className="overflow-x-auto px-3 pb-2">
        <div className="flex items-center gap-1.5 w-max">

          {/* Transport */}
          <button onClick={() => { selectSlate(slate.id); playSlate(slate.id); }} className="px-2.5 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 whitespace-nowrap">
            ▶ Play
          </button>
          <button onClick={pauseEngine}  className={cb}>⏸ Pause</button>
          <button onClick={resetEngine}  className={cb}>↺ Reset</button>

          <div className="w-px h-5 bg-neutral-700 mx-1 flex-shrink-0" />

          {/* Length */}
          <label className="flex items-center gap-1 text-[10px] text-neutral-500 whitespace-nowrap">
            Length
            <input
              type="number" min={0} step={0.5}
              value={slate.length}
              onChange={e => setSlateLength(slate.id, Number(e.target.value) || 0)}
              className="w-14 px-1 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs"
            />
            s
          </label>

          {/* Time */}
          <label className="flex items-center gap-1 text-[10px] text-neutral-500 whitespace-nowrap">
            Time
            <input
              type="number" min={0} step={0.1}
              value={Number(transportTime.toFixed(2))}
              onChange={e => seek(Number(e.target.value) || 0)}
              className="w-16 px-1 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs"
            />
            s
          </label>

          <div className="w-px h-5 bg-neutral-700 mx-1 flex-shrink-0" />

          {/* Clipboard */}
          {clipboard && (
            <button
              onClick={() => { selectSlate(slate.id); pasteRegion(slate.id, transportTime); }}
              className="px-2.5 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 whitespace-nowrap"
            >
              Paste
            </button>
          )}

          {/* Selection */}
          {!selection ? (
            <button onClick={startSelectionMode} className="px-2.5 py-1.5 text-xs rounded bg-indigo-600 hover:bg-indigo-500 whitespace-nowrap">
              + Selection
            </button>
          ) : (
            <>
              <select
                value={targetSlateId}
                onChange={e => setTargetSlateId(e.target.value)}
                className="px-2 py-1.5 text-xs rounded bg-neutral-900 border border-neutral-800 max-w-[120px]"
              >
                <option value="">This slate</option>
                {projectSlates.filter(s => s.id !== slate.id).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button onClick={confirmSelection} className="px-2.5 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 whitespace-nowrap">
                ✓ Confirm
              </button>
              <button onClick={cancelSelection} className={cb}>✕ Cancel</button>
            </>
          )}

          {/* Selected region actions */}
          {selectedRegion && (
            <>
              <div className="w-px h-5 bg-neutral-700 mx-1 flex-shrink-0" />
              <button
                onClick={() => lockRegion(slate.id, selectedRegion.id, !selectedRegion.meta.locked)}
                className={cb}
              >
                {selectedRegion.meta.locked ? "Unlock" : "Lock"}
              </button>
              <button
                onClick={() => removeRegion(slate.id, selectedRegion.id)}
                className="px-2.5 py-1.5 text-xs rounded bg-red-900/40 border border-red-800 text-red-300 whitespace-nowrap"
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
        className="relative w-full h-[80px] md:h-[120px] bg-neutral-950 border-t border-neutral-800 overflow-hidden cursor-pointer rounded-b-lg"
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