"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import GroupWFE from "@/components/editor/GroupWFE";
import ProjectPlayWindowWFE from "@/components/editor/ProjectPlayWindowWFE";

export default function ProjectWFE() {
  const projectTracks = useEditorStore(state => state.projectTracks);

  const isPlaying = useEngineStore(state => state.isPlaying);
  const resume = useEngineStore(state => state.resume);
  const pause = useEngineStore(state => state.pause);
  const reset = useEngineStore(state => state.play);

  if (projectTracks.length === 0) return null;

  return (
    <section className="mt-10 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-500/20">
        <span className="text-sm font-semibold text-indigo-300">
          Project Waveforms
        </span>

        <div className="flex gap-2">
          {/* Play / Pause */}
          <button
            onClick={() => (isPlaying ? pause() : resume())}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500"
          >
            {isPlaying ? "Pause All" : "Play All"}
          </button>

          {/* Reset */}
          <button
            onClick={reset}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {projectTracks.map(trackId => (
          <GroupWFE key={trackId} trackId={trackId} />
        ))}

        {/* ✅ DUMMY PLAY WINDOW AFTER TRACKS */}
        <ProjectPlayWindowWFE />
      </div>
    </section>
  );
}
