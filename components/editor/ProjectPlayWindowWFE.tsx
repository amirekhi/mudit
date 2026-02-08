"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";

export default function ProjectPlayWindowWFE() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const initializedRef = useRef(false);

  const transport = useEditorStore(s => s.transport);
  const projectTracks = useEditorStore(s => s.projectTracks);

  const playWindow = useEngineStore(s => s.playWindow);
  const setPlayWindow = useEngineStore(s => s.setPlayWindow);
  const play  = useEngineStore(s => s.play);
  const playRegion  = useEngineStore(s => s.playRegion);

  /* =========================
     Init dummy WaveSurfer
  ========================= */
  useEffect(() => {
    if (!containerRef.current) return;
    if (projectTracks.length === 0) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 80,
      waveColor: "transparent",
      progressColor: "transparent",
      cursorColor: "transparent",
      interact: false, // 🔒 no seeking
      normalize: false,
      plugins: [regions],
    });

    wsRef.current = ws;

    // Silent buffer with project duration
    ws.load(
      "",
      [new Float32Array(1)],
      transport.duration || 1
    );

    ws.on("ready", () => {
      if (!initializedRef.current) {
        const start = 0;
        const end = transport.duration || 1;

        setPlayWindow({ start, end });
        initializedRef.current = true;
      }
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
      regionsRef.current = null;
      initializedRef.current = false;
    };
  }, [projectTracks.length, transport.duration, setPlayWindow]);

  /* =========================
     Render / update play window
  ========================= */
  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions || !playWindow) return;
    if (projectTracks.length === 0) return;

    regions.clearRegions();

    const r = regions.addRegion({
      id: "__play_window__",
      start: playWindow.start,
      end: playWindow.end,
      drag: true,
      resize: true,
      color: "rgba(34,197,94,0.35)",
    });

    r.on("update-end", () => {
      playRegion({start: r.start, end: r.end});
    });

    r.on("click", () => {
      play();
    });
  }, [playWindow, projectTracks.length, setPlayWindow]);

  if (projectTracks.length === 0) return null;

  return (
    <div className="mt-4 border border-green-500/40 rounded bg-green-500/5 p-2">
      <div className="text-xs text-green-400 mb-1">
        Play Window
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
