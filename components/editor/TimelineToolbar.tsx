"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import { useTimelineStore } from "@/store/useTimelineStore";
import { useTimelinePps } from "@/lib/hooks/useTimeline";
import { toggleLoopAndRestart } from "@/lib/hooks/useEditorShortcuts";
import { formatTime, rulerSteps } from "@/util/timeline";

const btn =
  "px-2.5 py-1.5 text-xs rounded border whitespace-nowrap transition-colors bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200";
const btnOn =
  "px-2.5 py-1.5 text-xs rounded border whitespace-nowrap transition-colors bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white";

/** Zoom, snap, grid, loop and follow controls, plus a ruler that is shared by every slate. */
export default function TimelineToolbar({ referenceLength }: { referenceLength: number }) {
  const pps = useTimelinePps(referenceLength);
  const fit = useTimelineStore(s => s.fit);
  const snapEnabled = useTimelineStore(s => s.snapEnabled);
  const bpm = useTimelineStore(s => s.bpm);
  const division = useTimelineStore(s => s.division);
  const loop = useTimelineStore(s => s.loop);
  const follow = useTimelineStore(s => s.follow);
  const hasSelection = useTimelineStore(s => s.selectionRange !== null);
  const hasRegion = useEditorStore(s => !!s.selectedRegionId);
  const timeline = useTimelineStore.getState();

  // What Loop will loop: the green selection, else the selected region, else the whole slate
  const loopScope = hasSelection ? "selection" : hasRegion ? "region" : "slate";

  // BPM is edited as text and committed on blur / Enter, so typing "120" doesn't get clamped halfway
  const [bpmDraft, setBpmDraft] = useState(String(bpm));
  useEffect(() => setBpmDraft(String(bpm)), [bpm]);
  const commitBpm = () => {
    const value = Number(bpmDraft);
    if (Number.isFinite(value) && value > 0) timeline.setBpm(value);
    else setBpmDraft(String(bpm));
  };

  return (
    <div className="sticky top-0 z-30 space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur p-2">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <button onClick={() => timeline.zoomBy(0.8, referenceLength)} className={btn} title="Zoom out (-)">−</button>
        <button onClick={() => timeline.zoomBy(1.25, referenceLength)} className={btn} title="Zoom in (+)">+</button>
        <button onClick={() => timeline.setFit()} className={fit ? btnOn : btn} title="Fit the whole project (0)">Fit</button>
        <span className="text-[10px] text-neutral-500 w-14 text-center whitespace-nowrap">{Math.round(pps)} px/s</span>

        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 flex-shrink-0" />

        <button
          onClick={() => timeline.setSnapEnabled(!snapEnabled)}
          className={snapEnabled ? btnOn : btn}
          title="Snap regions to other regions' edges, the playhead and the beat grid (hold Shift while dragging to bypass)"
        >
          Snap
        </button>
        <label className="flex items-center gap-1 text-[10px] text-neutral-500 whitespace-nowrap">
          BPM
          <input
            type="number" min={20} max={400}
            value={bpmDraft}
            onChange={e => setBpmDraft(e.target.value)}
            onBlur={commitBpm}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-14 px-1 py-1 rounded bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs"
          />
        </label>
        <select
          value={division}
          onChange={e => timeline.setDivision(Number(e.target.value))}
          className="px-1.5 py-1.5 text-xs rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200"
          aria-label="Grid division"
        >
          <option value={1}>Beat</option>
          <option value={2}>1/2 beat</option>
          <option value={4}>1/4 beat</option>
        </select>

        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 flex-shrink-0" />

        <button
          onClick={toggleLoopAndRestart}
          className={loop ? btnOn : btn}
          title="Loop (L): loops the green selection if there is one, otherwise the selected region, otherwise the whole slate"
        >
          ↻ Loop · {loopScope}
        </button>
        <button onClick={() => timeline.setFollow(!follow)} className={follow ? btnOn : btn} title="Scroll along with the playhead">Follow</button>
      </div>

      <Ruler pps={pps} />
    </div>
  );
}

function Ruler({ pps }: { pps: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const ppsRef = useRef(pps);
  ppsRef.current = pps;

  const draw = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const dark = document.documentElement.classList.contains("dark");
    const lineColor = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
    const textColor = dark ? "#a3a3a3" : "#525252";

    const p = ppsRef.current;
    const scrollLeft = useTimelineStore.getState().scrollLeft;
    const { major, minor } = rulerSteps(p);
    const first = Math.floor(scrollLeft / p / minor);
    const last = Math.ceil((scrollLeft + width) / p / minor);
    if (last - first > 3000) return;

    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.lineWidth = 1;

    for (let i = first; i <= last; i++) {
      const t = i * minor;
      const x = Math.round(t * p - scrollLeft) + 0.5;
      const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6;
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.moveTo(x, isMajor ? 6 : height - 6);
      ctx.lineTo(x, height);
      ctx.stroke();
      if (isMajor) {
        ctx.fillStyle = textColor;
        ctx.fillText(formatTime(t, major), x + 3, 1);
      }
    }
  }, []);

  // Playhead on the ruler + follow-the-playhead scrolling
  useEffect(() => {
    const placeHead = () => {
      const head = headRef.current;
      const wrap = wrapRef.current;
      if (!head || !wrap) return;
      const x = useEditorStore.getState().transport.time * ppsRef.current - useTimelineStore.getState().scrollLeft;
      head.style.transform = `translateX(${x}px)`;
      head.style.opacity = x < 0 || x > wrap.clientWidth ? "0" : "1";
    };

    draw();
    placeHead();

    const unsubTime = useEditorStore.subscribe((state, prev) => {
      if (state.transport.time === prev.transport.time) return;
      placeHead();

      const timeline = useTimelineStore.getState();
      const wrap = wrapRef.current;
      if (timeline.follow && wrap && useEngineStore.getState().isPlaying) {
        const x = state.transport.time * ppsRef.current - timeline.scrollLeft;
        if (x > wrap.clientWidth - 24 || x < 0) {
          timeline.setScroll(Math.max(0, state.transport.time * ppsRef.current - 40), "follow");
        }
      }
    });
    const unsubScroll = useTimelineStore.subscribe((state, prev) => {
      if (state.scrollLeft !== prev.scrollLeft) {
        draw();
        placeHead();
      }
    });

    return () => {
      unsubTime();
      unsubScroll();
    };
  }, [draw, pps]);

  // Tell the store how wide the timeline area is (used by "Fit"), and redraw when it changes
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => {
      useTimelineStore.getState().setViewportWidth(wrap.clientWidth);
      draw();
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [draw]);

  const seekFromPointer = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left + useTimelineStore.getState().scrollLeft;
    void useEngineStore.getState().seekTo(Math.max(0, x / ppsRef.current));
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-6 overflow-hidden rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 cursor-pointer select-none"
      onPointerDown={e => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFromPointer(e);
      }}
      onPointerMove={e => {
        // Scrubbing while playing would restart playback on every move, so it only follows when stopped
        if (draggingRef.current && !useEngineStore.getState().isPlaying) seekFromPointer(e);
      }}
      onPointerUp={e => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (useEngineStore.getState().isPlaying) seekFromPointer(e);
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div ref={headRef} className="absolute top-0 bottom-0 left-0 w-px bg-red-500 pointer-events-none" />
    </div>
  );
}
