"use client";


import { useEditorStore } from "@/store/useEditorStore";
import GroupWFE from "@/components/editor/GroupWFE";

export default function ProjectWFE() {
  const projectTracks = useEditorStore(state => state.projectTracks);
  const isPlaying = useEditorStore(state => state.transport.isPlaying);
  const play = useEditorStore(state => state.play);
  const pause = useEditorStore(state => state.pause);

  if (projectTracks.length === 0) return null;

  return (
    <section className="mt-10 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-indigo-300">
            Project Waveforms
          </span>
          <span className="text-xs text-neutral-400">Synced Group</span>
        </div>

        <button
          onClick={() => (isPlaying ? pause() : play())}
          className="px-4 py-1.5 text-sm rounded-md
                     bg-indigo-600 hover:bg-indigo-500 transition"
        >
          {isPlaying ? "Pause All" : "Play All"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {projectTracks.map(trackId => (
          <GroupWFE key={trackId} trackId={trackId} />
        ))}
      </div>
    </section>
  );
}
