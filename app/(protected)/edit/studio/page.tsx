"use client";

import { useEffect } from "react";
import TrackList from "@/components/editor/TrackList";
import WaveformEditor from "@/components/editor/WaveformEditor";
import ToolPanel from "@/components/editor/ToolPanel";
import TrackHeader from "@/components/editor/TrackHeader";

import { Track } from "@/store/useAudioStore";
import { useEditorStore } from "@/store/useEditorStore";
import { trackToEditorTrack } from "@/lib/editor/trackToEditorTrack";


export default function EditorPage() {
  const { tracks, selectedTrackId, setTracks, selectTrack } =
    useEditorStore();

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) ?? null;

  useEffect(() => {
    fetch("/api/tracks/me")
      .then(res => res.json())
      .then((tracks: Track[]) => {
        setTracks(tracks.map(trackToEditorTrack));
      });
  }, [setTracks]);

  return (
    <div className="h-screen bg-neutral-950 text-white flex overflow-hidden">
      <aside className="w-80 border-r border-neutral-800 p-4">
        <TrackList
          tracks={tracks}
          selectedTrack={selectedTrack}
          onSelect={(t) => selectTrack(t.id)}
        />
      </aside>

      <main className="flex-1 flex flex-col">
        <TrackHeader track={selectedTrack?.source ?? null} />

        <div className="flex-1 flex">
          <div className="flex-1 p-6">
            {selectedTrack ? (
              <WaveformEditor editorTrack={selectedTrack} />
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
