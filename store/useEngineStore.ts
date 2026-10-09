"use client";

import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";
import { useTimelineStore } from "@/store/useTimelineStore";
import { compileSlate } from "@/util/compileRegions";
import type { CompiledRegion } from "@/util/compileRegions";
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
  /**
   * Plays one slate between two times (a selection or a region). Loops if the timeline's loop
   * switch is on. `from` lets playback start inside the range (e.g. resume at the playhead).
   */
  playRange(slateId: string, start: number, end: number, from?: number): Promise<void>;
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

const LEAD = 0.08;      // seconds of lead time so the first clips don't start "in the past"
const LOOKAHEAD = 1.5;  // loop passes are scheduled this far ahead
const MIN_LOOP = 0.25;  // shortest loop that is allowed

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** What is currently scheduled. Passes after the first one only exist while looping. */
interface PlayPlan {
  loop: boolean;
  start: number;      // where the first pass starts
  end: number;
  loopStart: number;  // where every later pass starts
  len0: number;       // length of the first pass
  lenLoop: number;    // length of every later pass
  first: CompiledRegion[];
  again: CompiledRegion[];
  t0: number;         // context time the first pass starts at
  scheduled: number;  // number of passes scheduled so far
}

export const useEngineStore = create<EngineState>((set, get) => {
  let masterChain: MasterChain | null = null;
  let tickHandle: number | null = null;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let playToken = 0;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let plan: PlayPlan | null = null;
  let currentRange: PlayWindow | undefined; // set while a selection is being played
  const groups = new Map<number, ClipHandle[]>(); // handles per loop pass
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

  /* ───────────── position (loop-aware) ───────────── */

  const currentPosition = () => {
    const { ctx, transportOffset, ctxStartTime } = get();
    if (!ctx) return transportOffset;
    const elapsed = Math.max(0, ctx.currentTime - ctxStartTime);
    if (!plan || !plan.loop) return transportOffset + elapsed;
    if (elapsed < plan.len0) return plan.start + elapsed;
    return plan.loopStart + ((elapsed - plan.len0) % plan.lenLoop);
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
    if (!s.isPlaying || !s.ctx || !plan) {
      tickHandle = null;
      return;
    }
    const t = currentPosition();
    useEditorStore.getState().seek(t);

    if (!plan.loop && t >= plan.end) {
      get().reset(); // natural end of playback rewinds to 0, same as a manual Reset
      return;
    }
    tickHandle = requestAnimationFrame(tick);
  };

  const startTick = () => {
    stopTick(); // never run two loops: they used to pile up on every restart
    tickHandle = requestAnimationFrame(tick);
  };

  /* ───────────── loop scheduling ───────────── */

  const syncSources = () => {
    const all: ClipHandle[] = [];
    groups.forEach(list => all.push(...list));
    set({ sources: all });
  };

  const iterationStart = (p: PlayPlan, k: number) => (k === 0 ? p.t0 : p.t0 + p.len0 + (k - 1) * p.lenLoop);
  const iterationAt = (p: PlayPlan, elapsed: number) =>
    elapsed < p.len0 ? 0 : 1 + Math.floor((elapsed - p.len0) / p.lenLoop);

  const scheduleIteration = (k: number) => {
    const p = plan;
    const ctx = get().ctx;
    if (!p || !ctx || !masterChain) return;
    const time = iterationStart(p, k);
    const list = k === 0 ? p.first : p.again;
    groups.set(k, list.map(r => scheduleClip(ctx, r, masterChain!.gain, time)));
  };

  // Keeps a second or so of looped passes scheduled ahead (sample-accurate, no gap at the loop point)
  const runScheduler = () => {
    const p = plan;
    const ctx = get().ctx;
    if (!p || !p.loop || !ctx || !get().isPlaying) return;

    const now = ctx.currentTime;
    let guard = 0;
    while (iterationStart(p, p.scheduled) < now + LOOKAHEAD && guard++ < 50) {
      scheduleIteration(p.scheduled);
      p.scheduled++;
    }

    const current = iterationAt(p, Math.max(0, now - p.t0));
    groups.forEach((_, k) => {
      if (k < current - 1) groups.delete(k); // already finished and cleaned up
    });
    syncSources();
  };

  const stopScheduler = () => {
    if (schedulerTimer !== null) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };

  /* ───────────── start / stop ───────────── */

  // Stops everything that is sounding and the playhead loop. Does not move the playhead.
  const stopSources = () => {
    stopTick();
    stopScheduler();
    groups.forEach(list => list.forEach(h => h.stop()));
    groups.clear();
    plan = null;
    set({ sources: [], isPlaying: false, transportOffset: 0, currentSlateIds: [] });
    useEditorStore.getState().pause();
  };

  const startPlayback = async (slates: Slate[], from: number, ids: string[], range?: PlayWindow) => {
    if (slates.length === 0) return;

    const duration = Math.max(...slates.map(s => s.length));
    if (!(duration > 0)) return;

    const end = range ? clamp(range.end, 0.05, duration) : duration;
    const loopStart = range ? clamp(range.start, 0, end - 0.05) : 0;
    let start = clamp(from, loopStart, end);
    if (start >= end - 0.01) start = loopStart; // at the very end: play again from the top

    const token = ++playToken;
    stopSources();

    const ctx = ensureCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
      if (token !== playToken) return; // a newer play request took over while we waited
    }

    const loop = useTimelineStore.getState().loop && end - loopStart >= MIN_LOOP;
    const firstWindow: PlayWindow = { start, end };
    const first = slates.flatMap(s => compileSlate(s, firstWindow));
    const again = loop
      ? start === loopStart
        ? first
        : slates.flatMap(s => compileSlate(s, { start: loopStart, end }))
      : [];

    const t0 = ctx.currentTime + LEAD;
    plan = { loop, start, end, loopStart, len0: end - start, lenLoop: end - loopStart, first, again, t0, scheduled: 0 };
    currentRange = range;

    scheduleIteration(0);
    plan.scheduled = 1;

    set({
      ctxStartTime: t0,
      transportOffset: start,
      isPlaying: true,
      playWindow: firstWindow,
      currentSlateIds: ids,
    });

    const editor = useEditorStore.getState();
    editor.setProjectDuration(duration);
    editor.seek(start);
    editor.play();

    if (loop) {
      runScheduler();
      schedulerTimer = setInterval(runScheduler, 200);
    } else {
      syncSources();
    }
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

    async playRange(slateId, start, end, from) {
      const slate = useEditorStore.getState().slates.find(s => s.id === slateId);
      if (!slate || end - start < 0.05) return;
      await startPlayback([slate], from ?? start, [slateId], { start, end });
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
      await startPlayback(slatesByIds(ids), useEditorStore.getState().transport.time, ids, currentRange);
    },

    reset() {
      stopSources();
      useEditorStore.getState().seek(0);
    },

    async seekTo(time) {
      const s = get();
      if (s.isPlaying && s.currentSlateIds.length > 0) {
        await startPlayback(slatesByIds(s.currentSlateIds), time, s.currentSlateIds, currentRange);
      } else {
        useEditorStore.getState().seek(time);
      }
    },

    async auditionEdit(slateId) {
      const s = get();
      if (s.isPlaying && s.currentSlateIds.includes(slateId)) {
        await startPlayback(slatesByIds(s.currentSlateIds), currentPosition(), s.currentSlateIds, currentRange);
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
