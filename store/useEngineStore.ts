"use client";

import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";
import { compileRegions } from "@/util/compileRegions";

import { EditorProject } from "@/types/editorTypes";
import { extractPeaks } from "@/util/extractPeaks";

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

  // 👇 NEW — Track specific visual compilation
  compileTrackPreview(trackId: string): Promise<void>;
}

export const useEngineStore = create<EngineState>((set, get) => {
  // --------------------------------------------------
  // INTERNAL: Build project from editor state
  // --------------------------------------------------
  const buildProject = (): EditorProject => {
    const editor = useEditorStore.getState();

    const tracks = editor.projectTracks
      .map(id => editor.tracks.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t);

    const duration = tracks.length
      ? Math.max(...tracks.map(t => t.duration))
      : 0;

    return {
      id: "runtime-project",
      ownerId: "runtime-owner",
      bpm: 120,
      sampleRate: 44100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      duration,
      tracks,
    };
  };

  // --------------------------------------------------
  // INTERNAL: Transport tick
  // --------------------------------------------------
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

  // --------------------------------------------------
  // INTERNAL: Schedule compiled playback
  // --------------------------------------------------
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

    const project = buildProject();
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

      source.connect(gainNode).connect(panNode).connect(ctx.destination);

      // Fade in
      if (r.fadeIn && r.fadeIn > 0) {
        gainNode.gain.setValueAtTime(0, ctxNow + r.when);
        gainNode.gain.linearRampToValueAtTime(
          r.gain,
          ctxNow + r.when + r.fadeIn
        );
      }

      // Fade out
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

  // --------------------------------------------------
  // STORE
  // --------------------------------------------------
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

    // --------------------------------------------------
    // 🎯 TRACK-SPECIFIC VISUAL COMPILATION
    // --------------------------------------------------
      async compileTrackPreview(trackId: string) {
        const project = buildProject();
        const track = project.tracks.find(t => t.id === trackId);
        if (!track || !track.duration) return;

        const fullWindow = {
          start: 0,
          end: track.duration,
        };
        console.log("Track duration:", track.duration);

        const compiled = compileRegions(project, fullWindow);

        const sampleRate = project.sampleRate;
        const length = Math.ceil(sampleRate * track.duration);

        const offline = new OfflineAudioContext(
          2,
          length,
          sampleRate
        );

        for (const r of compiled) {
          if (r.trackId !== trackId) continue;

          const source = offline.createBufferSource();
          source.buffer = r.buffer;
          source.playbackRate.value = r.playbackRate;

          const gainNode = offline.createGain();
          gainNode.gain.value = r.gain;

          const panNode = offline.createStereoPanner();
          panNode.pan.value = r.pan;

          source.connect(gainNode).connect(panNode).connect(offline.destination);

          source.start(r.when, r.offset, r.duration);
        }

        const rendered = await offline.startRendering();
        const peaks = extractPeaks(rendered);

        useEditorStore.getState().setPreviewPeaks(trackId, peaks);
    }
    

  };

  

  
});
