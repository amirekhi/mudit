"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "mudit.editor.trackPanelCollapsed";

/**
 * The left panel that holds the track list. It collapses to a thin strip so the timeline gets the
 * space; the choice is remembered. The children stay mounted while collapsed, so the search box
 * and any loading state survive.
 */
export default function TrackPanel({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  const toggle = () =>
    setCollapsed(current => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });

  const button =
    "flex h-6 w-6 items-center justify-center rounded text-sm leading-none text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors";

  return (
    <aside
      className={`flex-shrink-0 overflow-hidden border-r border-neutral-200 dark:border-neutral-800 transition-[width] duration-200 ease-out ${
        collapsed ? "w-10" : "w-80"
      }`}
    >
      {collapsed && (
        <div className="flex h-full flex-col items-center gap-3 py-3">
          <button onClick={toggle} className={button} aria-label="Show the track list" title="Show the track list">
            »
          </button>
          <span className="select-none text-[11px] font-medium uppercase tracking-widest text-neutral-500 [writing-mode:vertical-rl]">
            Tracks
          </span>
        </div>
      )}

      <div className={collapsed ? "hidden" : "flex h-full flex-col gap-2 p-4"}>
        <div className="flex flex-shrink-0 items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Tracks</span>
          <button onClick={toggle} className={button} aria-label="Hide the track list" title="Hide the track list for more room">
            «
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </aside>
  );
}
