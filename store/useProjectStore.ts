"use client";

import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import { decodeTrackAudio } from "@/lib/editor/decodeTrackAudio";
import type { Track } from "@/store/useAudioStore";
import type { Slate } from "@/types/slateTypes";
import type { MasterChannel } from "@/types/MasterChannel";
import { ApiError, projectApi, type ProjectSummary } from "@/lib/projects/projectApi";
import {
  hydrateSlates,
  sameProjectState,
  serializeProject,
  type DecodedSource,
  type ProjectSnapshot,
} from "@/lib/projects/serialize";

export type ProjectStatus = "idle" | "unsaved" | "saving" | "saved" | "loading" | "error" | "conflict";

const DEFAULT_NAME = "Untitled project";
const AUTOSAVE_MS = 2000;
const DECODE_CONCURRENCY = 3;
const DEFAULT_MASTER: MasterChannel = { volume: 1, muted: false, limiter: { enabled: false, ceiling: 0.98 } };

interface ProjectStore {
  projectId: string | null;
  name: string;
  savedName: string;
  rev: number;
  status: ProjectStatus;
  error: string | null;
  lastSavedAt: number | null;
  loadProgress: { done: number; total: number } | null;
  missingSources: number;

  projects: ProjectSummary[];
  projectsLoading: boolean;

  setName(name: string): void;
  isDirty(): boolean;
  saveNow(): Promise<void>;
  saveAsCopy(): Promise<void>;
  loadProject(id: string): Promise<void>;
  newProject(): void;
  deleteProject(id: string): Promise<void>;
  refreshProjects(): Promise<void>;
  /** Call once from the editor page. Returns the cleanup function. */
  initAutosave(): () => void;
}

const snapshotNow = (): ProjectSnapshot => {
  const s = useEditorStore.getState();
  return { slates: s.slates, armedSlateIds: s.armedSlateIds, master: s.master };
};

const replaceEditorState = (slates: Slate[], armedSlateIds: string[], master: MasterChannel) => {
  useEngineStore.getState().reset(); // stop playback before the slates are swapped
  useEditorStore.setState({
    slates,
    armedSlateIds,
    master,
    past: [],
    future: [],
    selectedSlateId: null,
    selectedRegionId: null,
    selectedClipId: null,
    clipboard: null,
  });
};

// Decodes the source tracks a project uses, a few at a time. A track that fails to decode is
// simply left out: its clips become silent placeholders and are reported to the user.
async function decodeSources(
  tracks: Track[],
  onProgress: (done: number, total: number) => void
): Promise<Map<string, DecodedSource>> {
  const sources = new Map<string, DecodedSource>();
  const queue = [...tracks];
  const total = tracks.length;
  let done = 0;
  onProgress(0, total);

  const worker = async () => {
    while (queue.length > 0) {
      const track = queue.shift()!;
      try {
        const { buffer, peaks } = await decodeTrackAudio(track.url);
        sources.set(track._id, { buffer, peaks });
      } catch (err) {
        console.error(`Could not decode "${track.title}":`, err);
      } finally {
        done++;
        onProgress(done, total);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(DECODE_CONCURRENCY, total) }, worker));
  return sources;
}

const mergeIntoLibrary = (tracks: Track[]) => {
  const editor = useEditorStore.getState();
  const have = new Set(editor.library.map(t => t._id));
  const extra = tracks.filter(t => !have.has(t._id));
  if (extra.length > 0) editor.setLibrary([...editor.library, ...extra]);
};

export const useProjectStore = create<ProjectStore>((set, get) => {
  // What the server currently has. Compared against the editor state to know if there is unsaved work.
  let baseline: ProjectSnapshot | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let suppress = false; // true while we replace the editor state ourselves (load / new)

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const scheduleAutosave = () => {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void get().saveNow();
    }, AUTOSAVE_MS);
  };

  const onEditorChange = (state: ReturnType<typeof useEditorStore.getState>, prev: typeof state) => {
    if (suppress) return;
    // Playback ticks, selection and so on don't touch these three, so they cost nothing here
    if (state.slates === prev.slates && state.master === prev.master && state.armedSlateIds === prev.armedSlateIds) {
      return;
    }

    const s = get();
    if (s.status === "loading" || s.status === "saving" || s.status === "conflict") return;

    if (s.isDirty()) {
      set({ status: "unsaved" });
      if (s.projectId) scheduleAutosave(); // never creates a project on its own, only the first manual Save does
    } else if (s.status === "unsaved") {
      set({ status: s.projectId ? "saved" : "idle" });
    }
  };

  return {
    projectId: null,
    name: DEFAULT_NAME,
    savedName: DEFAULT_NAME,
    rev: 0,
    status: "idle",
    error: null,
    lastSavedAt: null,
    loadProgress: null,
    missingSources: 0,

    projects: [],
    projectsLoading: false,

    setName(name) {
      set({ name });
      const s = get();
      if (s.status === "loading" || s.status === "saving" || s.status === "conflict") return;
      if (s.isDirty()) {
        set({ status: "unsaved" });
        if (s.projectId) scheduleAutosave();
      } else {
        set({ status: s.projectId ? "saved" : "idle" });
      }
    },

    isDirty() {
      const current = snapshotNow();
      const sameState = sameProjectState(current, baseline ?? current);
      return !sameState || get().name.trim() !== get().savedName.trim();
    },

    async saveNow() {
      const s = get();
      if (s.status === "saving" || s.status === "loading") return;
      clearTimer();

      const snapshot = snapshotNow();
      const name = (s.name.trim() || DEFAULT_NAME).slice(0, 100);
      const data = serializeProject(snapshot);
      set({ status: "saving", error: null });

      try {
        if (!s.projectId) {
          const created = await projectApi.create({ name, data });
          set({ projectId: created._id, rev: created.rev });
        } else {
          const updated = await projectApi.update(s.projectId, { name, data, baseRev: s.rev });
          set({ rev: updated.rev });
        }

        baseline = snapshot;
        set({ name, savedName: name, lastSavedAt: Date.now(), status: "saved" });

        // Edits made while the request was in flight are still unsaved
        if (get().isDirty()) {
          set({ status: "unsaved" });
          scheduleAutosave();
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 409 && s.projectId) {
          set({ status: "conflict", error: e.message });
        } else {
          set({ status: "error", error: e instanceof Error ? e.message : "Could not save" });
        }
      }
    },

    // Used after a conflict: keeps this tab's work as a new project instead of overwriting
    async saveAsCopy() {
      const s = get();
      if (s.status === "saving" || s.status === "loading") return;
      clearTimer();

      const snapshot = snapshotNow();
      const name = `${s.name.trim() || DEFAULT_NAME} (copy)`.slice(0, 100);
      set({ status: "saving", error: null });

      try {
        const created = await projectApi.create({ name, data: serializeProject(snapshot) });
        baseline = snapshot;
        set({
          projectId: created._id,
          rev: created.rev,
          name,
          savedName: name,
          lastSavedAt: Date.now(),
          status: "saved",
        });
        if (get().isDirty()) {
          set({ status: "unsaved" });
          scheduleAutosave();
        }
      } catch (e) {
        set({ status: "error", error: e instanceof Error ? e.message : "Could not save a copy" });
      }
    },

    async loadProject(id) {
      if (get().status === "saving") return;
      clearTimer();
      suppress = true;
      set({ status: "loading", error: null, loadProgress: null });

      try {
        const { project, tracks, missingTrackIds } = await projectApi.get(id);

        const sources = await decodeSources(tracks, (done, total) => set({ loadProgress: { done, total } }));
        const { slates, missingClips } = hydrateSlates(project.data, sources);

        const armed = project.data.armedSlateIds.filter(a => slates.some(s => s.id === a));
        const master = project.data.master as MasterChannel;

        replaceEditorState(slates, armed, master);
        mergeIntoLibrary(tracks);
        baseline = { slates, armedSlateIds: armed, master };

        set({
          projectId: project._id,
          name: project.name,
          savedName: project.name,
          rev: project.rev,
          status: "saved",
          lastSavedAt: new Date(project.updatedAt).getTime(),
          loadProgress: null,
          missingSources: missingClips > 0 || missingTrackIds.length > 0 ? Math.max(missingClips, 1) : 0,
        });
      } catch (e) {
        set({
          status: "error",
          error: e instanceof Error ? e.message : "Could not open the project",
          loadProgress: null,
        });
      } finally {
        suppress = false;
      }
    },

    newProject() {
      clearTimer();
      suppress = true;
      replaceEditorState([], [], DEFAULT_MASTER);
      baseline = snapshotNow();
      suppress = false;
      set({
        projectId: null,
        name: DEFAULT_NAME,
        savedName: DEFAULT_NAME,
        rev: 0,
        status: "idle",
        error: null,
        lastSavedAt: null,
        loadProgress: null,
        missingSources: 0,
      });
    },

    async deleteProject(id) {
      await projectApi.remove(id);
      if (get().projectId === id) get().newProject();
      await get().refreshProjects();
    },

    async refreshProjects() {
      set({ projectsLoading: true });
      try {
        set({ projects: await projectApi.list(), projectsLoading: false });
      } catch {
        set({ projectsLoading: false });
      }
    },

    initAutosave() {
      if (!baseline) baseline = snapshotNow();
      const unsubscribe = useEditorStore.subscribe(onEditorChange);

      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (get().isDirty()) {
          e.preventDefault();
          e.returnValue = "";
        }
      };
      window.addEventListener("beforeunload", onBeforeUnload);

      return () => {
        unsubscribe();
        window.removeEventListener("beforeunload", onBeforeUnload);
      };
    },
  };
});
