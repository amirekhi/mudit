"use client";

import { useEffect } from "react";
import TrackList from "@/components/editor/TrackList";
import WaveformEditor from "@/components/editor/WaveformEditor";
import ToolPanel from "@/components/editor/ToolPanel";
import TrackHeader from "@/components/editor/TrackHeader";

import { Track } from "@/store/useAudioStore";
import { useEditorStore } from "@/store/useEditorStore";
import { trackToEditorTrack } from "@/lib/editor/trackToEditorTrack";
import GroupWFE from "@/components/editor/GroupWFE";
import ProjectWFE from "@/components/editor/ProjectWFE";

export default function EditorPage() {
  const {
    tracks,
    armedTrackIds,
    selectedTrackId,
    setTracks,
    projectTracks,
  } = useEditorStore();


    

  useEffect(() => {
    console.log("🎛 Editor Tracks snapshot:");
    console.dir(tracks, { depth: null });
  }, [tracks]);

  
  const selectedTrack =
    tracks.find(t => t.id === selectedTrackId)?.source ?? null;

  useEffect(() => {
    fetch("/api/tracks/me")
      .then(res => res.json())
      .then((tracks: Track[]) => {
        setTracks(tracks.map(trackToEditorTrack));
      });
  }, [setTracks]);

  return (
    <div className="h-screen bg-neutral-950 text-white flex min-h-0">
      <aside className="w-80 border-r border-neutral-800 p-4">
        <TrackList />
      </aside>

      <main className="flex-1 flex flex-col min-h-0">

        <TrackHeader track={selectedTrack} />

        <div className="flex-1 flex min-h-0">

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {armedTrackIds.length === 0 && (
              <div className="h-full flex items-center justify-center text-neutral-500">
                Arm a track to start editing
              </div>
            )}

          {armedTrackIds
            .filter(id => !projectTracks.includes(id))
            .map(trackId => (
              <WaveformEditor key={trackId} trackId={trackId} />
            ))
          }

            <ProjectWFE/>

          </div>

          <ToolPanel disabled={armedTrackIds.length === 0} />
        </div>
      </main>
    </div>
  );
}
