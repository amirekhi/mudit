"use client";

import { useMemo, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useAudioStore, Track } from "@/store/useAudioStore";
import { decodeTrackAudio } from "@/lib/editor/decodeTrackAudio";

export default function TrackList() {
  const [query,    setQuery]    = useState("");
  const [armingId, setArmingId] = useState<string | null>(null);

  const library         = useEditorStore(s => s.library);
  const slates          = useEditorStore(s => s.slates);
  const armedSlateIds   = useEditorStore(s => s.armedSlateIds);
  const loadTrackAsSlate = useEditorStore(s => s.loadTrackAsSlate);
  const toggleArmSlate  = useEditorStore(s => s.toggleArmSlate);

  const { playTrack, currentTrack } = useAudioStore();

  const filtered = useMemo(() =>
    library.filter(t =>
      `${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase())
    ),
    [library, query]
  );

  const slateForTrack = (trackId: string) =>
    slates.find(s => s.kind === "single" && s.sourceTrackId === trackId);

  const handleToggleArm = async (track: Track) => {
    const existing = slateForTrack(track._id);
    if (existing) { toggleArmSlate(existing.id); return; }

    setArmingId(track._id);
    try {
      const { buffer, peaks } = await decodeTrackAudio(track.url);
      const slateId = loadTrackAsSlate(track, buffer, peaks);
      toggleArmSlate(slateId);
    } catch (err) {
      console.error("Failed to decode track:", err);
    } finally {
      setArmingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Search */}
      <input
        placeholder="Search tracks…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800
          text-sm text-white placeholder-neutral-500 outline-none
          focus:ring-2 focus:ring-indigo-500 flex-shrink-0"
      />

      {/* Track list */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-600 text-center py-6">No tracks found</p>
        )}

        {filtered.map(track => {
          const slate     = slateForTrack(track._id);
          const isArmed   = !!slate && armedSlateIds.includes(slate.id);
          const isArming  = armingId === track._id;
          const isPlaying = currentTrack?._id === track._id;

          return (
            <div
              key={track._id}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors
                hover:bg-neutral-800 ${isArmed ? "bg-indigo-500/10 border border-indigo-500/20" : ""}`}
            >
              {/* Arm checkbox — larger touch target on mobile */}
              <button
                disabled={isArming}
                onClick={() => handleToggleArm(track)}
                className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center
                  border transition-colors ${
                  isArmed
                    ? "bg-indigo-500 border-indigo-400"
                    : "border-neutral-600 hover:border-neutral-400"
                } ${isArming ? "opacity-40" : ""}`}
                aria-label={isArmed ? "Unarm track" : "Arm track"}
              >
                {isArmed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isArming && (
                  <span className="w-2.5 h-2.5 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
                )}
              </button>

              {/* Track info — tap to preview */}
              <button
                onClick={() => playTrack(track)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-sm font-medium text-neutral-200 truncate flex items-center gap-1.5">
                  {track.title}
                  {isPlaying && (
                    <span className="text-[10px] text-indigo-400 flex-shrink-0">▶</span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 truncate">{track.artist}</div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}