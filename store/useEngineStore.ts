"use client";

import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";

interface PlayWindow {
  start: number;
  end: number;
}

interface EngineState {
  ctx: AudioContext | null;
  sources: AudioBufferSourceNode[];
  isPlaying: boolean;

  ctxStartTime: number;
  transportOffset: number; // <- the offset of transport at pause

  playWindow: PlayWindow | null;

  setPlayWindow(win: PlayWindow): void;

  play(): Promise<void>;
  playRegion(win: PlayWindow): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reset(): void;
}

export const useEngineStore = create<EngineState>((set, get) => {
  const startTick = () => {
    const ctx = get().ctx;
    const win = get().playWindow;
    if (!ctx || !win) return;

    const tick = () => {
      if (!get().isPlaying || ctx.state !== "running") return;

      const now = ctx.currentTime;
      const t = get().transportOffset + (now - get().ctxStartTime);

      useEditorStore.getState().seek(t);

      if (t >= win.end) {
        get().reset();
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const scheduleSources = async (win: PlayWindow) => {
    const editor = useEditorStore.getState();
    let ctx = get().ctx;

    if (!ctx) {
      ctx = new AudioContext();
      set({ ctx });
    }

    if (ctx.state === "suspended") await ctx.resume();

    const ctxNow = ctx.currentTime;
    const scheduled: AudioBufferSourceNode[] = [];

    for (const track of editor.tracks) {
      if (!track.audioBuffer) continue;

      for (const region of track.regions) {
        if (region.end <= win.start || region.start >= win.end) continue;

        const playStart = Math.max(region.start, win.start);
        const playEnd = Math.min(region.end, win.end);
        const duration = playEnd - playStart;
        if (duration <= 0) continue;

        const source = ctx.createBufferSource();
        source.buffer = track.audioBuffer;
        source.connect(ctx.destination);

        const when = ctxNow + (playStart - win.start);
        const offset = playStart;

        source.start(when, offset, duration);
        scheduled.push(source);
      }
    }

    set({
      sources: scheduled,
      ctxStartTime: ctxNow,
      transportOffset: win.start,
      isPlaying: true,
    });

    editor.seek(win.start);
    editor.play();

    startTick();
  };

  return {
    ctx: null,
    sources: [],
    isPlaying: false,
    ctxStartTime: 0,
    transportOffset: 0,
    playWindow: null,

    setPlayWindow(win) {
      set({ playWindow: win });
    },

    async play() {
      const win = get().playWindow;
      if (!win) return;

      get().reset();
      await scheduleSources(win);
    },

    async playRegion(win) {
      set({ playWindow: win });
      get().reset();
      await scheduleSources(win);
    },

    async pause() {
      const ctx = get().ctx;
      if (!ctx || ctx.state !== "running") return;

      const pausedOffset = get().transportOffset + (ctx.currentTime - get().ctxStartTime);

      await ctx.suspend();

      set({
        isPlaying: false,
        transportOffset: pausedOffset,
      });

      useEditorStore.getState().pause();
    },

    async resume() {
      const ctx = get().ctx;
      if (!ctx || get().isPlaying) return;

      const offset = get().transportOffset;

      await ctx.resume();

      set({
        isPlaying: true,
        ctxStartTime: ctx.currentTime, // <-- only update ctxStartTime
        transportOffset: offset,       // <-- keep paused offset
      });

      useEditorStore.getState().play();

      startTick();
    },

    reset() {
      get().sources.forEach(s => {
        try {
          s.stop();
        } catch {}
      });

      set({
        sources: [],
        isPlaying: false,
        transportOffset: 0,
      });

      useEditorStore.getState().pause();
    },
  };
});
