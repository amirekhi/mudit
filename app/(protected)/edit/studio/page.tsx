"use client";

import { useEffect, useState } from "react";
import TrackList from "@/components/editor/TrackList";
import WaveformEditor from "@/components/editor/WaveformEditor";
import ToolPanel from "@/components/editor/ToolPanel";
import TrackHeader from "@/components/editor/TrackHeader";
import { Track } from "@/store/useAudioStore";

export default function EditorPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tracks/me")
      .then(res => res.json())
      .then(data => setTracks(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-screen bg-neutral-950 text-white flex overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-80 border-r border-neutral-800 p-4">
        <h2 className="text-lg font-semibold mb-4">Your Tracks</h2>

        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : (
          <TrackList
            tracks={tracks}
            selectedTrack={selectedTrack}
            onSelect={setSelectedTrack}
          />
        )}
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col">
        <TrackHeader track={selectedTrack} />

        <div className="flex-1 flex">
          <div className="flex-1 p-6">
            {selectedTrack ? (
              <WaveformEditor track={selectedTrack} />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500">
                Select a track to start editing
              </div>
            )}
          </div>

          <ToolPanel disabled={!selectedTrack} />
        </div>
      </main>
    </div>
  );
}
