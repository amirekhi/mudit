"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import type { Region } from "wavesurfer.js/dist/plugins/regions";

import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase/firebase";

import { useEditorStore } from "@/store/useEditorStore";
import { EditorRegion } from "@/types/editorTypes";

interface Props {
  trackId: string;
}

const getRegionColor = (
  region: EditorRegion,
  selectedRegionId: string | null
) => {
  if (region.id === selectedRegionId) return "rgba(99,102,241,0.5)";
  if (region.status === "edited") return "rgba(99,102,241,0.35)";
  return "rgba(99,102,241,0.2)";
};

export default function WaveformEditor({ trackId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);

  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  

  const {
    tracks,
    selectedRegionId,
    updateRegion,
    selectRegion,
    setTrackDuration,
    selectTrack,
  } = useEditorStore();

  const track = tracks.find(t => t.id === trackId);
  if (!track) return null;

  // Select current track
  useEffect(() => {
    selectTrack(track.id);
  }, [track.id, selectTrack]);

  // Initialize waveform
  useEffect(() => {
    if (!containerRef.current) return;

    let ws: WaveSurfer | null = null;
    let regions: RegionsPlugin | null = null;

    const init = async () => {
      containerRef.current!.innerHTML = "";
      setLoading(true);

      const url = await getDownloadURL(ref(storage, track.source.url));

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
        setTrackDuration(track.id, ws!.getDuration());
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
  }, [track.id, setTrackDuration]);

  // Render regions
  useEffect(() => {
    const ws = wsRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    regions.clearRegions();

    track.regions.forEach((region, i) => {
      const r: Region = regions.addRegion({
        id: region.id,
        start: region.start,
        end: region.end,
        drag: true,
        resize: true,
        color: getRegionColor(region, selectedRegionId),
      });

      if (i === 0 && !selectedRegionId) selectRegion(region.id);

      r.on("click", (e) => {
        e.stopPropagation();
        selectTrack(track.id);
        selectRegion(region.id);
        ws.stop();
        ws.play(r.start, r.end);
      });

      r.on("update-end", () => {
        // 🔹 Reset edits if region is moved
        const isMoved = r.start !== region.start || r.end !== region.end;
        const newStatus = isMoved ? "empty" : region.status;
        const newEdits = isMoved ? {} : region.edits;

        updateRegion(track.id, region.id, {
          start: r.start,
          end: r.end,
          status: newStatus,
          edits: newEdits,
        });

        ws.stop();
        ws.play(r.start, r.end);
      });
    });
  }, [track.regions, selectedRegionId, selectRegion, selectTrack, updateRegion]);

  // Add new region button
  const addRegion = () => {
    const lastRegion = track.regions[track.regions.length - 1];
    const nextStart = lastRegion ? lastRegion.end : 0;
    const windowSize = 10; // seconds

    const newRegion: EditorRegion = {
      id: crypto.randomUUID(),
      sourceTrackId: track.id,
      start: nextStart,
      end: nextStart + windowSize,
      edits: {},
      status: "empty",
    };

    track.regions.push(newRegion);
    selectRegion(newRegion.id);
  };

  const togglePlay = () => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.isPlaying() ? ws.pause() : ws.play();
  };

  return (
    <div className="space-y-2 border border-neutral-800 rounded p-3">
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          disabled={loading}
          className="px-3 py-1 text-sm rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          onClick={addRegion}
          className="px-3 py-1 text-sm rounded bg-indigo-600 hover:bg-indigo-500"
        >
          Add Region
        </button>

        {loading && (
          <span className="text-xs text-neutral-500">Loading waveform…</span>
        )}
      </div>

      <div ref={containerRef} />
    </div>
  );
}
