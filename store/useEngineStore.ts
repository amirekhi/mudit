"use client";

import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";
import { compileSlate } from "@/util/compileRegions";
import { Slate } from "@/types/slateTypes";
import { extractPeaks } from "@/util/extractPeaks";
import {
  applyMasterParams,
  createMasterChain,
  renderMix,
  scheduleClip,
} from "@/util/engine/audioGraph";
import type { ClipHandle, MasterChain } from "@/util/engine/audioGraph";

interface PlayWindow {
  start: number;
  end: number;
}

export interface RenderOptions {
  /** Soft-limit at 0.98 even if the master limiter is off. */
  safetyLimiter?: boolean;
}

interface EngineState {
  ctx: AudioContext | null;
  sources: ClipHandle[];
  isPlaying: boolean;
  ctxStartTime: number;
  transportOffset: number;
  playWindow: PlayWindow | null;
  currentSlateIds: string[]; // which slate(s) are the active playback source: drives the "now playing" indicator

  setPlayWindow(win: PlayWindow): void;
  playProject(): Promise<void>;
  playSlate(slateId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reset(): void; // stop AND rewind playhead to 0

  /** Move the playhead. While playing, playback continues from the new position. */
  seekTo(time: number): Promise<void>;
  /** After an edit: restart what is playing (so the edit is heard), or audition the edited slate. */
  auditionEdit(slateId: string): Promise<void>;
  /** Debounced restart for continuous controls (sliders). Only acts while that slate is playing. */
  refreshSoon(slateId: string): void;

  compileSlatePreview(slateId: string): Promise<void>;
  renderProjectOffline(opts?: RenderOptions): Promise<AudioBuffer | null>;
}

const LEAD = 0.08; // seconds of lead time so the first clips don't start "in the past"
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const useEngineStore = create<EngineState>((set, get) => {
  let masterChain: MasterChain | null = null;
  let tickHandle: number | null = null;
  let playToken = 0;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const previewTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const previewTokens = new Map<string, number>();

  /* ───────────── context + master ───────────── */

  const ensureCtx = (): AudioContext => {
    const existing = get().ctx;
    if (existing) return existing;

    const ctx = new AudioContext();
    masterChain = createMasterChain(ctx);
    applyMasterParams(masterChain, ctx, useEditorStore.getState().master);

    // Master volume / mute / limiter changes are heard immediately, without restarting playback
    useEditorStore.subscribe((state, prev) => {
      if (state.master !== prev.master && masterChain) {
        applyMasterParams(masterChain, ctx, state.master, { smooth: true });
      }
    });

    set({ ctx });
    return ctx;
  };

  const currentPosition = () => {
    const { ctx, transportOffset, ctxStartTime } = get();
    if (!ctx) return transportOffset;
    return transportOffset + Math.max(0, ctx.currentTime - ctxStartTime);
  };

  /* ───────────── playhead loop (exactly one at any time) ───────────── */

  const stopTick = () => {
    if (tickHandle !== null) {
      cancelAnimationFrame(tickHandle);
      tickHandle = null;
    }
  };

  const tick = () => {
    const s = get();
    if (!s.isPlaying || !s.ctx || !s.playWindow) {
      tickHandle = null;
      return;
    }
    const t = currentPosition();
    useEditorStore.getState().seek(t);

    if (t >= s.playWindow.end) {
      get().reset(); // natural end of playback rewinds to 0, same as a manual Reset
      return;
    }
    tickHandle = requestAnimationFrame(tick);
  };

  const startTick = () => {
    stopTick(); // never run two loops: they used to pile up on every restart
    tickHandle = requestAnimationFrame(tick);
  };

  /* ───────────── start / stop ───────────── */

  // Stops everything that is sounding and the playhead loop. Does not move the playhead.
  const stopSources = () => {
    stopTick();
    get().sources.forEach(h => h.stop());
    set({ sources: [], isPlaying: false, transportOffset: 0, currentSlateIds: [] });
    useEditorStore.getState().pause();
  };

  const startPlayback = async (slates: Slate[], from: number, ids: string[]) => {
    if (slates.length === 0) return;

    const duration = Math.max(...slates.map(s => s.length));
    if (!(duration > 0)) return;

    let start = clamp(from, 0, duration);
    if (start >= duration - 0.01) start = 0; // at the very end: play again from the top

    const token = ++playToken;
    stopSources();

    const ctx = ensureCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
      if (token !== playToken) return; // a newer play request took over while we waited
    }

    const win: PlayWindow = { start, end: duration };
    const compiled = slates.flatMap(s => compileSlate(s, win));
    const t0 = ctx.currentTime + LEAD;
    const dest = masterChain!.gain;
    const handles = compiled.map(r => scheduleClip(ctx, r, dest, t0));

    set({
      sources: handles,
      ctxStartTime: t0,
      transportOffset: start,
      isPlaying: true,
      playWindow: win,
      currentSlateIds: ids,
    });

    const editor = useEditorStore.getState();
    editor.setProjectDuration(win.end);
    editor.seek(win.start);
    editor.play();
    startTick();
  };

  const slatesByIds = (ids: string[]) =>
    useEditorStore.getState().slates.filter(s => ids.includes(s.id));

  /* ───────────── waveform preview (debounced, latest wins) ───────────── */

  const renderPreview = async (slateId: string) => {
    const editor = useEditorStore.getState();
    const slate = editor.slates.find(s => s.id === slateId);
    if (!slate) return;

    const duration = slate.length;
    if (duration <= 0) return;

    const token = (previewTokens.get(slateId) ?? 0) + 1;
    previewTokens.set(slateId, token);

    try {
      // A muted slate still shows its waveform. The preview is rendered cheaply: 22.05 kHz,
      // and lower still for very long slates so the offline buffer stays small.
      const compiled = compileSlate({ ...slate, muted: false }, { start: 0, end: duration });
      const sampleRate = clamp(Math.floor(12_000_000 / duration), 8000, 22050);
      const rendered = await renderMix(compiled, duration, { sampleRate });

      if (previewTokens.get(slateId) !== token) return; // superseded by a newer render
      if (!useEditorStore.getState().slates.some(s => s.id === slateId)) return; // slate was deleted

      useEditorStore.getState().setSlatePreviewPeaks(slateId, extractPeaks(rendered));
    } catch (err) {
      console.error("Waveform preview failed:", err);
    }
  };

  return {
    ctx: null,
    sources: [],
    isPlaying: false,
    ctxStartTime: 0,
    transportOffset: 0,
    playWindow: null,
    currentSlateIds: [],

    setPlayWindow: (win) => set({ playWindow: win }),

    async playProject() {
      const slates = useEditorStore.getState().slates.filter(s => s.kind === "project");
      await startPlayback(slates, useEditorStore.getState().transport.time, slates.map(s => s.id));
    },

    async playSlate(slateId) {
      const slate = useEditorStore.getState().slates.find(s => s.id === slateId);
      if (!slate) return;
      await startPlayback([slate], useEditorStore.getState().transport.time, [slateId]);
    },

    // Stops the sound, keeps the playhead where it is and keeps the "paused here" indicator.
    async pause() {
      const s = get();
      if (!s.isPlaying) return;

      const position = currentPosition();
      const ids = s.currentSlateIds;

      stopSources();
      set({ currentSlateIds: ids });
      useEditorStore.getState().seek(position);
    },

    async resume() {
      const ids = get().currentSlateIds;
      if (get().isPlaying || ids.length === 0) return;
      await startPlayback(slatesByIds(ids), useEditorStore.getState().transport.time, ids);
    },

    reset() {
      stopSources();
      useEditorStore.getState().seek(0);
    },

    async seekTo(time) {
      const s = get();
      if (s.isPlaying && s.currentSlateIds.length > 0) {
        await startPlayback(slatesByIds(s.currentSlateIds), time, s.currentSlateIds);
      } else {
        useEditorStore.getState().seek(time);
      }
    },

    async auditionEdit(slateId) {
      const s = get();
      if (s.isPlaying && s.currentSlateIds.includes(slateId)) {
        await startPlayback(slatesByIds(s.currentSlateIds), currentPosition(), s.currentSlateIds);
        return;
      }
      await get().playSlate(slateId);
    },

    refreshSoon(slateId) {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        const s = get();
        if (s.isPlaying && s.currentSlateIds.includes(slateId)) void get().auditionEdit(slateId);
      }, 150);
    },

    async compileSlatePreview(slateId) {
      const pending = previewTimers.get(slateId);
      if (pending) clearTimeout(pending);
      previewTimers.set(
        slateId,
        setTimeout(() => {
          previewTimers.delete(slateId);
          void renderPreview(slateId);
        }, 120)
      );
    },

    async renderProjectOffline(opts = {}) {
      const editorState = useEditorStore.getState();
      const projectSlates = editorState.slates.filter(s => s.kind === "project");
      if (projectSlates.length === 0) return null;

      const duration = Math.max(...projectSlates.map(s => s.length));
      if (!(duration > 0)) return null;

      const win = { start: 0, end: duration };
      const compiled = projectSlates.flatMap(s => compileSlate(s, win));
      if (compiled.length === 0) return null;

      return renderMix(compiled, duration, {
        sampleRate: 44100,
        useMaster: true,
        master: editorState.master,
        safetyLimiter: opts.safetyLimiter,
      });
    },
  };
});
