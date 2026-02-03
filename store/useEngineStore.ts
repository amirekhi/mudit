"use client";

import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";

interface PlayRegionRequest {
  start: number;
  end: number;
}

interface EngineState {
  ctx: AudioContext | null;
  sources: AudioBufferSourceNode[];
  isPlaying: boolean;

  ctxStartTime: number;
  transportStartTime: number;

  playRegion(req: PlayRegionRequest): Promise<void>;
  stop(): void;
}

export const useEngineStore = create<EngineState>((set, get) => ({
  ctx: null,
  sources: [],
  isPlaying: false,
  ctxStartTime: 0,
  transportStartTime: 0,

  async playRegion({ start, end }) {
    const editor = useEditorStore.getState();

    get().stop();

    let ctx = get().ctx;
    if (!ctx) {
      ctx = new AudioContext();
      set({ ctx });
    }
    if (ctx.state === "suspended") await ctx.resume();

    const ctxNow = ctx.currentTime;

    set({
      isPlaying: true,
      ctxStartTime: ctxNow,
      transportStartTime: start,
    });

    editor.seek(start);
    editor.play();

    const scheduled: AudioBufferSourceNode[] = [];

    for (const track of editor.tracks) {
      if (!track.audioBuffer) continue;

      for (const region of track.regions) {
        if (region.end <= start || region.start >= end) continue;

        const playStart = Math.max(region.start, start);
        const playEnd = Math.min(region.end, end);
        const duration = playEnd - playStart;
        if (duration <= 0) continue;

        const source = ctx.createBufferSource();
        source.buffer = track.audioBuffer;
        source.connect(ctx.destination);

        // 🔑 CORRECT OFFSET (buffer time)
        const when = ctxNow + (playStart - start);
        const offset = playStart;

        source.start(when, offset, duration);
        scheduled.push(source);
      }
    }

    set({ sources: scheduled });

    // Visual sync loop (derived from AudioContext)
    const tick = () => {
      if (!get().isPlaying) return;

      const now = ctx.currentTime;
      const t =
        get().transportStartTime +
        (now - get().ctxStartTime);

      editor.seek(t);

      if (t >= end) {
        get().stop();
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  },

  stop() {
    get().sources.forEach(s => {
      try { s.stop(); } catch {}
    });

    set({
      sources: [],
      isPlaying: false,
    });

    useEditorStore.getState().pause();
  },
}));
