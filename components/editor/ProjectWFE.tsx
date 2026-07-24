"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import SlateEditor from "@/components/editor/SlateEditor";
import ExportDialog from "@/components/editor/ExportDialog";

export default function ProjectWFE({ referenceLength }: { referenceLength: number }) {
  const slates        = useEditorStore(s => s.slates);
  const addSlate      = useEditorStore(s => s.addSlate);
  const projectSlates = slates.filter(s => s.kind === "project");

  const isPlaying  = useEngineStore(s => s.isPlaying);
  const pause      = useEngineStore(s => s.pause);
  const playProject = useEngineStore(s => s.playProject);
  const reset      = useEngineStore(s => s.reset);

  const [exportOpen, setExportOpen] = useState(false);

  const cb = "px-3 py-1.5 rounded text-xs font-medium transition-colors";

  return (
    <section className="mt-6 rounded-xl border border-indigo-300/40 dark:border-indigo-500/30 bg-indigo-500/5">

      {/* Header */}
      <div className="px-4 py-3 border-b border-indigo-300/30 dark:border-indigo-500/20 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Project Slates</span>

        {/* Button row — wraps on mobile, single row on sm+ */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => addSlate()}
            className={`${cb} bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200`}
          >
            + New Slate
          </button>
          <button
            onClick={playProject}
            disabled={projectSlates.length === 0}
            className={`${cb} bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40`}
          >
            ▶ Play All
          </button>
          <button
            onClick={pause}
            disabled={!isPlaying}
            className={`${cb} bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-40`}
          >
            ⏸ Pause
          </button>
          <button
            onClick={reset}
            disabled={projectSlates.length === 0}
            className={`${cb} bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-40`}
          >
            ↺ Reset
          </button>
          <button
            onClick={() => setExportOpen(true)}
            disabled={projectSlates.length === 0}
            className={`${cb} bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40`}
          >
            Export MP3
          </button>
        </div>
      </div>

      {/* Slates */}
      <div className="p-3 md:p-4 space-y-3 md:space-y-4">
        {projectSlates.length === 0 ? (
          <div className="text-sm text-neutral-500 text-center py-8">
            No project slates yet — hit "+ New Slate", or send a selection from a source track into one.
          </div>
        ) : (
          projectSlates.map(slate => (
            <SlateEditor key={slate.id} slateId={slate.id} referenceLength={referenceLength} />
          ))
        )}
      </div>

      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </section>
  );
}