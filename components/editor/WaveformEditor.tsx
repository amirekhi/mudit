"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import type { Region } from "wavesurfer.js/dist/plugins/regions";

import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase/firebase";

import { EditorTrack } from "@/types/editorTypes";
import { useEditorStore } from "@/store/useEditorStore";

interface Props {
  editorTrack: EditorTrack;
}

export default function WaveformEditor({ editorTrack }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);

  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    updateRegion,
    setTrackDuration,
    selectRegion,
    selectedRegionId,
  } = useEditorStore();

  // ───────────────────────────────
  // Initialize WaveSurfer
  // ───────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    let ws: WaveSurfer | null = null;
    let regions: RegionsPlugin | null = null;

    const init = async () => {
      setLoading(true);

      // Clear previous waveform
      containerRef.current!.innerHTML = "";

      const url = await getDownloadURL(ref(storage, editorTrack.source.url));

      regions = RegionsPlugin.create();

      ws = WaveSurfer.create({
        container: containerRef.current!,
        waveColor: "#444",
        progressColor: "#6366f1",
        cursorColor: "#fff",
        height: 140,
        normalize: true,
        plugins: [regions],
      });

      ws.load(url);

      ws.on("ready", () => {
        setTrackDuration(editorTrack.id, ws!.getDuration());
        setLoading(false);
      });

      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("finish", () => setIsPlaying(false));

      wsRef.current = ws;
      regionsRef.current = regions;
    };

    init();

    return () => {
      ws?.destroy();
      wsRef.current = null;
      regionsRef.current = null;
    };
  }, [editorTrack.id]);

  // ───────────────────────────────
  // Sync regions from store → WaveSurfer
  // ───────────────────────────────
  useEffect(() => {
    const regions = regionsRef.current;
    const ws = wsRef.current;
    if (!regions || !ws) return;

    regions.clearRegions();

    editorTrack.regions.forEach((region) => {
      const r: Region = regions.addRegion({
        id: region.id,
        start: region.start,
        end: region.end,
        drag: true,
        resize: true,
        color:
          region.id === selectedRegionId
            ? "rgba(99,102,241,0.45)"
            : "rgba(99,102,241,0.25)",
      });

      // select region
      r.on("click", (e) => {
        e.stopPropagation();
        selectRegion(region.id);

        // auto-play selected region
        ws.stop();
        ws.play(region.start, region.end);
      });

      // persist edits
      r.on("update-end", () => {
        updateRegion(editorTrack.id, region.id, {
          start: r.start,
          end: r.end,
        });

        // auto-play after resize
        ws.stop();
        ws.play(r.start, r.end);
      });
    });
  }, [editorTrack.regions, selectedRegionId]);

  // ───────────────────────────────
  // Controls
  // ───────────────────────────────
  const togglePlay = () => {
    const ws = wsRef.current;
    if (!ws) return;

    if (ws.isPlaying()) {
      ws.pause();
      return;
    }

    const region =
      selectedRegionId &&
      editorTrack.regions.find((r) => r.id === selectedRegionId);

    if (region && region.end > region.start) {
      ws.play(region.start, region.end);
    } else {
      ws.play();
    }
  };

  // ───────────────────────────────
  // Render
  // ───────────────────────────────
  return (
    <div className="space-y-3">
      <div ref={containerRef} />

      {loading && (
        <p className="text-sm text-neutral-400">Loading waveform…</p>
      )}

      <button
        onClick={togglePlay}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 text-white rounded text-sm"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
}
