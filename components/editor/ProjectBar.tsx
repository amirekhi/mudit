"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";

const confirmDiscard = () =>
  !useProjectStore.getState().isDirty() ||
  window.confirm("You have unsaved changes. Continue and discard them?");

export default function ProjectBar() {
  const name = useProjectStore(s => s.name);
  const status = useProjectStore(s => s.status);
  const error = useProjectStore(s => s.error);
  const projectId = useProjectStore(s => s.projectId);
  const lastSavedAt = useProjectStore(s => s.lastSavedAt);
  const loadProgress = useProjectStore(s => s.loadProgress);
  const missingSources = useProjectStore(s => s.missingSources);

  const [listOpen, setListOpen] = useState(false);

  // Starts autosave and the "unsaved changes" warning when leaving the page
  useEffect(() => useProjectStore.getState().initAutosave(), []);

  const actions = useProjectStore.getState();
  const busy = status === "saving" || status === "loading";

  const statusText = () => {
    switch (status) {
      case "loading":
        return loadProgress ? `Loading sources ${loadProgress.done}/${loadProgress.total}…` : "Loading…";
      case "saving":
        return "Saving…";
      case "saved":
        return lastSavedAt
          ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Saved";
      case "unsaved":
        return projectId ? "Unsaved changes" : "Not saved yet";
      case "error":
        return `Couldn't save${error ? `: ${error}` : ""}`;
      case "conflict":
        return "Changed in another tab or window";
      default:
        return projectId ? "Saved" : "New project";
    }
  };

  const statusColor =
    status === "error" || status === "conflict"
      ? "text-red-500 dark:text-red-400"
      : status === "unsaved"
      ? "text-amber-600 dark:text-amber-400"
      : "text-neutral-500 dark:text-neutral-400";

  const btn =
    "px-2.5 py-1.5 text-xs rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 whitespace-nowrap transition-colors disabled:opacity-40";

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-transparent">
      <div className="flex items-center gap-2 px-4 md:px-6 py-2 overflow-x-auto">
        <input
          value={name}
          onChange={e => actions.setName(e.target.value)}
          disabled={status === "loading"}
          maxLength={100}
          aria-label="Project name"
          className="min-w-[8rem] w-48 px-2 py-1.5 rounded bg-transparent border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 focus:border-neutral-300 dark:focus:border-neutral-600 focus:outline-none text-sm font-medium text-neutral-900 dark:text-white"
        />

        <span className={`text-xs whitespace-nowrap ${statusColor}`}>{statusText()}</span>

        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {status === "conflict" && projectId && (
            <>
              <button onClick={() => actions.loadProject(projectId)} className={btn}>
                Reload latest
              </button>
              <button onClick={() => actions.saveAsCopy()} className={btn}>
                Save as copy
              </button>
            </>
          )}
          <button
            onClick={() => { if (confirmDiscard()) actions.newProject(); }}
            disabled={busy}
            className={btn}
          >
            New
          </button>
          <button onClick={() => setListOpen(true)} disabled={busy} className={btn}>
            Open
          </button>
          <button
            onClick={() => actions.saveNow()}
            disabled={busy || status === "conflict"}
            className="px-3 py-1.5 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap transition-colors disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      {missingSources > 0 && (
        <p className="px-4 md:px-6 pb-2 text-xs text-amber-700 dark:text-amber-400">
          Some clips use tracks that were deleted or couldn&apos;t be loaded. They play silent, and nothing else was changed.
        </p>
      )}

      {listOpen && <ProjectsDialog onClose={() => setListOpen(false)} />}
    </div>
  );
}

function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const projects = useProjectStore(s => s.projects);
  const loading = useProjectStore(s => s.projectsLoading);
  const currentId = useProjectStore(s => s.projectId);
  const [error, setError] = useState("");

  useEffect(() => {
    void useProjectStore.getState().refreshProjects();
  }, []);

  const open = (id: string) => {
    if (id !== currentId && !confirmDiscard()) return;
    onClose();
    void useProjectStore.getState().loadProject(id);
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setError("");
    try {
      await useProjectStore.getState().deleteProject(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the project");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Your projects</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

        <ul className="max-h-80 overflow-y-auto space-y-1.5">
          {loading && projects.length === 0 && (
            <li className="text-sm text-neutral-500 py-4 text-center">Loading…</li>
          )}
          {!loading && projects.length === 0 && (
            <li className="text-sm text-neutral-500 py-4 text-center">No saved projects yet</li>
          )}
          {projects.map(p => (
            <li
              key={p._id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                p._id === currentId
                  ? "border-indigo-400/60 bg-indigo-500/5"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{p.name}</p>
                <p className="text-[11px] text-neutral-500">
                  {p.slateCount} slate{p.slateCount === 1 ? "" : "s"} · {new Date(p.updatedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => open(p._id)}
                className="px-2.5 py-1.5 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Open
              </button>
              <button
                onClick={() => remove(p._id, p.name)}
                className="px-2.5 py-1.5 text-xs rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-300"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
