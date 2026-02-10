"use client";

import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";
import { compileRegions } from "@/util/compileRegions";
import { EditorProject } from "@/types/editorTypes";


interface PlayWindow {
  start: number;
  end: number;
}

interface EngineState {
  ctx: AudioContext | null;
  sources: AudioBufferSourceNode[];
  isPlaying: boolean;

  ctxStartTime: number;
  transportOffset: number;

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

  const scheduleCompiled = async (win: PlayWindow) => {
  const editor = useEditorStore.getState();
  let ctx = get().ctx;

  if (!ctx) {
    ctx = new AudioContext();
    set({ ctx });
  }

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  // -----------------------------
  // Build a temporary project object
  // -----------------------------
  const project: EditorProject = {
    id: "temp-project",
    ownerId: "temp-owner",
    bpm: 120,
    sampleRate: 44100,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    duration: 0, // will calculate below
    tracks: editor.projectTracks
      .map(trackId => editor.tracks.find(t => t.id === trackId))
      .filter((t): t is NonNullable<typeof t> => !!t), // filter out undefined
  };

  // Update project duration based on max track duration
  project.duration = project.tracks.length
    ? Math.max(...project.tracks.map(t => t.duration))
    : 0;

  // -----------------------------
  // Now compile regions using this project
  // -----------------------------
  const compiled = compileRegions(project, win);
  const ctxNow = ctx.currentTime;

  const scheduled: AudioBufferSourceNode[] = [];

  for (const r of compiled) {
    const source = ctx.createBufferSource();
    source.buffer = r.buffer;
    source.playbackRate.value = r.playbackRate;

    const gainNode = ctx.createGain();
    gainNode.gain.value = r.gain;

    const panNode = ctx.createStereoPanner();
    panNode.pan.value = r.pan;

    source
      .connect(gainNode)
      .connect(panNode)
      .connect(ctx.destination);

    if (r.fadeIn && r.fadeIn > 0) {
      gainNode.gain.setValueAtTime(0, ctxNow + r.when);
      gainNode.gain.linearRampToValueAtTime(
        r.gain,
        ctxNow + r.when + r.fadeIn
      );
    }

    if (r.fadeOut && r.fadeOut > 0) {
      gainNode.gain.setValueAtTime(
        r.gain,
        ctxNow + r.when + r.duration - r.fadeOut
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        ctxNow + r.when + r.duration
      );
    }

    source.start(ctxNow + r.when, r.offset, r.duration);
    scheduled.push(source);
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
      await scheduleCompiled(win);
    },

    async playRegion(win) {
      set({ playWindow: win });
      get().reset();
      await scheduleCompiled(win);
    },

    async pause() {
      const ctx = get().ctx;
      if (!ctx || ctx.state !== "running") return;

      const pausedOffset =
        get().transportOffset +
        (ctx.currentTime - get().ctxStartTime);

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

      await ctx.resume();

      set({
        isPlaying: true,
        ctxStartTime: ctx.currentTime,
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
