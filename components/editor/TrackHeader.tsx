"use client";

import { Slate } from "@/types/slateTypes";

export default function TrackHeader({ slate }: { slate: Slate | null }) {
  return (
    <header className="
      min-h-14 border-b border-neutral-200 dark:border-neutral-800
      px-4 md:px-6 py-3
      flex items-center justify-between gap-3
      flex-shrink-0
      bg-white dark:bg-transparent transition-colors
    ">
      {slate ? (
        <>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-neutral-900 dark:text-white truncate text-sm md:text-base">
              {slate.name}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {slate.kind === "single" ? "Source Track" : "Project Slate"}
            </div>
          </div>

          <div className="flex gap-1.5 flex-shrink-0">
            <button className="
              px-2.5 md:px-4 py-1.5 md:py-2
              rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700
              text-neutral-700 dark:text-neutral-200
              text-xs md:text-sm transition-colors
            ">
              Save
            </button>
            <button className="
              px-2.5 md:px-4 py-1.5 md:py-2
              rounded bg-indigo-600 hover:bg-indigo-500 text-white
              text-xs md:text-sm transition-colors
            ">
              Export
            </button>
          </div>
        </>
      ) : (
        <div className="text-sm text-neutral-500">Editor</div>
      )}
    </header>
  );
}