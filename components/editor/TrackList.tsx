"use client";

import { useMemo, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useAudioStore } from "@/store/useAudioStore";

export default function TrackList() {
  const [query, setQuery] = useState("");

  // Editor store – for armed tracks
  const { tracks, armedTrackIds, toggleArmTrack } = useEditorStore();
  // Audio store – for preview
  const { playTrack, currentTrack } = useAudioStore();

  const filtered = useMemo(() => {
    return tracks.filter(t =>
      `${t.source.title} ${t.source.artist}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [tracks, query]);

  // -------------------------
  // Handlers
  // -------------------------

  // Play preview only
  const handlePreview = (track: typeof tracks[number]) => {
    playTrack({
      _id: track.id,
      title: track.source.title,
      artist: track.source.artist,
      url: track.source.url,
      visibility: "private",
      createdAt: "",
      updatedAt: "",
    });
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="flex flex-col h-full">
      <input
        placeholder="Search tracks…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="mb-3 px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm outline-none"
      />

      <div className="space-y-1 overflow-y-auto">
        {filtered.map(track => {
          const isArmed = armedTrackIds.includes(track.id);
          const isPlaying = currentTrack?._id === track.id;

          return (
            <div
              key={track.id}
              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer
                hover:bg-neutral-800`}
            >
              {/* Checkbox – arm track */}
              <input
                type="checkbox"
                checked={isArmed}
                onClick={e => e.stopPropagation()} // prevent preview
                onChange={() => toggleArmTrack(track.id)}
              />

              {/* Track info – clicking plays preview */}
              <div
                className="flex-1 overflow-hidden"
                onClick={() => handlePreview(track)}
              >
                <div className="font-medium truncate flex items-center gap-2">
                  {track.source.title}
                  {isPlaying && (
                    <span className="text-xs text-indigo-300">(playing)</span>
                  )}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {track.source.artist}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
