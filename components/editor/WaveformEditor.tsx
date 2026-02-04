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
  if (region.meta.color) return region.meta.color;
  if (region.id === selectedRegionId) return "rgba(99,102,241,0.5)";
  if (region.status === "edited") return "rgba(99,102,241,0.35)";
  return "rgba(99,102,241,0.2)";
};

export default function WaveformEditor({ trackId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);

  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const master = useEditorStore(state => state.master);

  const {
    tracks,
    selectedRegionId,
    updateRegion,
    selectRegion,
    setTrackDuration,
    selectTrack,
    addRegion,
    createChildRegion,
    addTrackToProject,
    removeTrackFromProject,
    projectTracks,
  } = useEditorStore();

  const track = tracks.find(t => t.id === trackId);
  if (!track) return null;

  const selectedRegion = track.regions.find(
    r => r.id === selectedRegionId
  );

  const isInProject = projectTracks.includes(track.id);

  /* =========================
     Master volume sync
  ========================= */
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const effectiveVolume = master.muted ? 0 : master.volume;
    const finalVolume = master.limiter.enabled
      ? Math.min(effectiveVolume, master.limiter.ceiling)
      : effectiveVolume;

    ws.setVolume(finalVolume);
  }, [master]);

  useEffect(() => {
    selectTrack(track.id);
  }, [track.id, selectTrack]);

  /* =========================
     Initialize WaveSurfer
  ========================= */
  useEffect(() => {
    if (!containerRef.current) return;

    let ws: WaveSurfer | null = null;
    let regions: RegionsPlugin | null = null;

    const init = async () => {
      containerRef.current!.innerHTML = "";
      setLoading(true);
      setIsReady(false);

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
        const wsInstance = ws!;

        const audioBuffer = wsInstance.getDecodedData();
        const exported = wsInstance.exportPeaks({
          channels: 1,
          precision: 10000,
        });

        const peaks = exported[0];
        const duration = wsInstance.getDuration();

        const editor = useEditorStore.getState();
        editor.setTrackDuration(track.id, duration);
        editor.setTrackAudioBuffer(track.id, audioBuffer);
        editor.setTrackPeaks(track.id, peaks);

        setLoading(false);
        setIsReady(true);
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

  /* =========================
     Render regions (existing + new)
  ========================= */
  useEffect(() => {
    if (!isReady) return;

    const ws = wsRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    regions.clearRegions();

    track.regions.forEach((region, i) => {
      const r: Region = regions.addRegion({
        id: region.id,
        start: region.start,
        end: region.end,
        drag: !region.meta.locked,
        resize: !region.meta.locked,
        color: getRegionColor(region, selectedRegionId),
      });

      if (i === 0 && !selectedRegionId) {
        selectRegion(region.id);
      }

      r.on("click", e => {
        e.stopPropagation();
        selectTrack(track.id);
        selectRegion(region.id);
        ws.stop();
        ws.play(r.start, r.end);
      });

      r.on("update-end", () => {
        if (region.meta.locked) return;

        if (region.parentRegionId) {
          const parent = track.regions.find(
            r => r.id === region.parentRegionId
          );
          if (
            parent &&
            (r.start < parent.start || r.end > parent.end)
          ) {
            updateRegion(track.id, region.id, {
              start: region.start,
              end: region.end,
            });
            return;
          }
        }

        updateRegion(track.id, region.id, {
          start: r.start,
          end: r.end,
        });

        ws.stop();
        ws.play(r.start, r.end);
      });
    });
  }, [
    isReady,
    track.regions,
    selectedRegionId,
    selectRegion,
    selectTrack,
    updateRegion,
  ]);

  /* =========================
     Controls
  ========================= */
  const handleAddParentRegion = () => {
    const topLevel = track.regions.filter(r => !r.parentRegionId);
    const last = topLevel.at(-1);
    const start = last ? last.end : 0;
    addRegion(track.id, start, start + 10);
  };

  const handleAddChildRegion = () => {
    if (!selectedRegion) return;

    const length = (selectedRegion.end - selectedRegion.start) * 0.25;
    const start = selectedRegion.start + length * 0.5;
    const end = Math.min(start + length, selectedRegion.end);

    createChildRegion(track.id, selectedRegion.id, start, end);
  };

  const togglePlay = () => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.isPlaying() ? ws.pause() : ws.play();
  };

  return (
    <div className="space-y-2 border border-neutral-800 rounded p-3">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={isInProject}
            onChange={e =>
              e.target.checked
                ? addTrackToProject(track.id)
                : removeTrackFromProject(track.id)
            }
            className="accent-indigo-500"
          />
          Project
        </label>

        <button
          onClick={togglePlay}
          disabled={loading}
          className="px-3 py-1 text-sm rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          onClick={handleAddParentRegion}
          className="px-3 py-1 text-sm rounded bg-indigo-600 hover:bg-indigo-500"
        >
          Add Region
        </button>

        <button
          onClick={handleAddChildRegion}
          disabled={!selectedRegion}
          className="px-3 py-1 text-sm rounded bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40"
        >
          Add Inside
        </button>
      </div>

      <div ref={containerRef} />
    </div>
  );
}
