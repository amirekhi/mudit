"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import type { Region } from "wavesurfer.js/dist/plugins/regions";

import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase/firebase";

import { useEditorStore } from "@/store/useEditorStore";
import { EditorRegion } from "@/types/editorTypes";
import { useEngineStore } from "@/store/useEngineStore";

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

export default function GroupWFE({ trackId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);


  const playRegionEngine = useEngineStore(state => state.playRegion);
  // 🔒 feedback-loop protection
  const isUserSeekingRef = useRef(false);

  const [loading, setLoading] = useState(true);

  const {
    tracks,
    selectedRegionId,
    updateRegion,
    selectRegion,
    selectTrack,
    addRegion,
    createChildRegion,
    projectTracks,
    addTrackToProject,
    removeTrackFromProject,
    setTransportDurationIfLonger,
    transport,
    seek,
    master,
  } = useEditorStore();

  const track = tracks.find(t => t.id === trackId);
  if (!track) return null;

  const isInProject = projectTracks.includes(track.id);

  const trackWidthPercent =
    transport.duration > 0
      ? (track.duration / transport.duration) * 100
      : 100;

  const selectedRegion = track.regions.find(
    r => r.id === selectedRegionId
  );

  /* =========================
     Pointer lifecycle
  ========================= */
  useEffect(() => {
    const stopSeeking = () => {
      isUserSeekingRef.current = false;
    };

    window.addEventListener("pointerup", stopSeeking);
    window.addEventListener("mouseup", stopSeeking);
    window.addEventListener("touchend", stopSeeking);

    return () => {
      window.removeEventListener("pointerup", stopSeeking);
      window.removeEventListener("mouseup", stopSeeking);
      window.removeEventListener("touchend", stopSeeking);
    };
  }, []);

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
      
if (track.peaks && track.duration) {
  // ✅ reuse cached peaks (no download)
  ws.load(track.source.url, [track.peaks], track.duration);
} else {
  // ❌ fallback (first time only)
  const url = await getDownloadURL(ref(storage, track.source.url));
  ws.load(url);
}



      ws.on("ready", () => {
        setTransportDurationIfLonger(track.id, ws!.getDuration());
        setLoading(false);
      });

      /* USER → TRANSPORT */
      ws.on("interaction", () => {
        isUserSeekingRef.current = true;
      });

      ws.on("seek" as any, (progress: number) => {
        const duration = ws!.getDuration();
        if (!duration) return;
        seek(progress * duration);
      });

      /* WS → TRANSPORT */
      ws.on("timeupdate", (time) => {
        if (!isUserSeekingRef.current) {
          seek(time);
        }
      });

      wsRef.current = ws;
      regionsRef.current = regions;
    };

    init();

    return () => {
      ws?.destroy();
      wsRef.current = null;
      regionsRef.current = null;
    };
  }, [track.id, seek, setTransportDurationIfLonger]);

  /* =========================
     TRANSPORT → SEEK (visual sync)
  ========================= */
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || loading || isUserSeekingRef.current) return;

    const diff = Math.abs(ws.getCurrentTime() - transport.time);
    if (diff > 0.05) {
      ws.setTime(transport.time);
    }
  }, [transport.time, loading]);

  /* =========================
     Render regions
  ========================= */
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

            // Tell the engine to play starting from this region
            playRegionEngine({
              
              
              start: region.start,
              end: region.end,
            });
          });

        r.on("update-end", () => {
          if (region.meta.locked) return;

          updateRegion(track.id, region.id, {
            start: r.start,
            end: r.end,
          });

          // Also use engine here
          playRegionEngine({
            
     
            start: r.start,
            end: r.end,
          });
        }); 
    });
  }, [
    track.regions,
    selectedRegionId,
    selectRegion,
    selectTrack,
    updateRegion,
    seek,
  ]);

  /* =========================
     Controls
  ========================= */
  const handleAddRegion = () => {
    const topLevel = track.regions.filter(r => !r.parentRegionId);
    const last = topLevel.at(-1);
    const start = last ? last.end : 0;
    addRegion(track.id, start, start + 10);
  };

  const handleAddInside = () => {
    if (!selectedRegion) return;
    const len = (selectedRegion.end - selectedRegion.start) * 0.25;
    const start = selectedRegion.start + len * 0.5;
    createChildRegion(
      track.id,
      selectedRegion.id,
      start,
      Math.min(start + len, selectedRegion.end)
    );
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
          onClick={handleAddRegion}
          className="px-3 py-1 text-sm rounded bg-indigo-600 hover:bg-indigo-500"
        >
          Add Region
        </button>

        <button
          onClick={handleAddInside}
          disabled={!selectedRegion}
          className="px-3 py-1 text-sm rounded bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40"
        >
          Add Inside
        </button>

        {loading && (
          <span className="text-xs text-neutral-500">
            Loading waveform…
          </span>
        )}
      </div>

      <div ref={containerRef} style={{ width: `${trackWidthPercent}%` }} />
    </div>
  );
}
