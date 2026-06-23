"use client";

import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";
import { compileSlate } from "@/util/compileRegions";
import { Slate } from "@/types/slateTypes";
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
  currentSlateIds: string[]; // which slate(s) are the active playback source — drives the "now playing" indicator

  setPlayWindow(win: PlayWindow): void;
  playProject(): Promise<void>;
  playSlate(slateId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reset(): void; // stop AND rewind playhead to 0 — bound to the explicit "Reset" button
  compileSlatePreview(slateId: string): Promise<void>;
  renderProjectOffline(): Promise<AudioBuffer | null>;
}

export const useEngineStore = create<EngineState>((set, get) => {
  const slateDuration = (slate: Slate) => slate.length;

  // Internal-only: stop whatever's currently sounding WITHOUT touching the
  // playhead position. Used before starting fresh playback so "Play" can
  // start from wherever transport.time currently is, instead of always 0.
  const stopSources = () => {
    get().sources.forEach(s => {
      try { s.stop(); } catch {}
    });
    set({ sources: [], isPlaying: false, transportOffset: 0, currentSlateIds: [] });
    useEditorStore.getState().pause();
  };

  

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
        get().reset(); // natural end-of-playback rewinds to 0, same as a manual Reset
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const scheduleCompiled = async (win: PlayWindow, slatesToPlay: Slate[]) => {
    const editor = useEditorStore.getState();
    let ctx = get().ctx;

    if (!ctx) {
      ctx = new AudioContext();
      set({ ctx });
    }
    if (ctx.state === "suspended") await ctx.resume();

    const compiled = slatesToPlay.flatMap(s => compileSlate(s, win));
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

      if (r.fadeIn && r.fadeIn > 0) {
        gainNode.gain.setValueAtTime(0, ctxNow + r.when);
        gainNode.gain.linearRampToValueAtTime(r.gain, ctxNow + r.when + r.fadeIn);
      }
      if (r.fadeOut && r.fadeOut > 0) {
        gainNode.gain.setValueAtTime(r.gain, ctxNow + r.when + r.duration - r.fadeOut);
        gainNode.gain.linearRampToValueAtTime(0, ctxNow + r.when + r.duration);
      }

      source.start(ctxNow + r.when, r.offset, r.duration);
      scheduled.push(source);
    }

    set({ sources: scheduled, ctxStartTime: ctxNow, transportOffset: win.start, isPlaying: true, playWindow: win });

    editor.setProjectDuration(win.end);
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
    currentSlateIds: [],

    async renderProjectOffline() {
  const editorState = useEditorStore.getState();
  const projectSlates = editorState.slates.filter(s => s.kind === "project");
  if (projectSlates.length === 0) return null;

  const duration = Math.max(...projectSlates.map(slateDuration));
  if (duration <= 0) return null;

  const win = { start: 0, end: duration };
  const compiled = projectSlates.flatMap(s => compileSlate(s, win));
  if (compiled.length === 0) return null;

  const sampleRate = 44100;
  const length = Math.ceil(sampleRate * duration);
  const offline = new OfflineAudioContext(2, length, sampleRate);

  for (const r of compiled) {
    const source = offline.createBufferSource();
    source.buffer = r.buffer;
    source.playbackRate.value = r.playbackRate;

    const gainNode = offline.createGain();
    gainNode.gain.value = r.gain;

    const panNode = offline.createStereoPanner();
    panNode.pan.value = r.pan;

    source.connect(gainNode).connect(panNode).connect(offline.destination);

    if (r.fadeIn && r.fadeIn > 0) {
      gainNode.gain.setValueAtTime(0, r.when);
      gainNode.gain.linearRampToValueAtTime(r.gain, r.when + r.fadeIn);
    }
    if (r.fadeOut && r.fadeOut > 0) {
      gainNode.gain.setValueAtTime(r.gain, r.when + r.duration - r.fadeOut);
      gainNode.gain.linearRampToValueAtTime(0, r.when + r.duration);
    }

    source.start(r.when, r.offset, r.duration);
  }

  return await offline.startRendering();
},

    setPlayWindow: (win) => set({ playWindow: win }),

    async playProject() {
      const editorState = useEditorStore.getState();
      const projectSlates = editorState.slates.filter(s => s.kind === "project");
      if (projectSlates.length === 0) return;

      const maxDuration = Math.max(...projectSlates.map(slateDuration));
      if (maxDuration <= 0) return;

      // start from wherever the shared playhead currently is, clamped to range
      const startTime = Math.min(Math.max(editorState.transport.time, 0), maxDuration);

      stopSources();
      set({ currentSlateIds: projectSlates.map(s => s.id) });
      await scheduleCompiled({ start: startTime, end: maxDuration }, projectSlates);
    },

    async playSlate(slateId) {
      const editorState = useEditorStore.getState();
      const slate = editorState.slates.find(s => s.id === slateId);
      if (!slate) return;

      const duration = slateDuration(slate);
      if (duration <= 0) return;

      const startTime = Math.min(Math.max(editorState.transport.time, 0), duration);

      stopSources();
      set({ currentSlateIds: [slateId] });
      await scheduleCompiled({ start: startTime, end: duration }, [slate]);
    },

    async pause() {
      const ctx = get().ctx;
      if (!ctx || ctx.state !== "running") return;

      const pausedOffset = get().transportOffset + (ctx.currentTime - get().ctxStartTime);
      await ctx.suspend();

      set({ isPlaying: false, transportOffset: pausedOffset }); // currentSlateIds deliberately untouched — keeps the "paused here" indicator visible
      useEditorStore.getState().pause();
    },

    async resume() {
      const ctx = get().ctx;
      if (!ctx || get().isPlaying) return;

      await ctx.resume();
      set({ isPlaying: true, ctxStartTime: ctx.currentTime });

      useEditorStore.getState().play();
      startTick();
    },

    reset() {
      stopSources();
      useEditorStore.getState().seek(0);
    },

    async compileSlatePreview(slateId) {
      const slate = useEditorStore.getState().slates.find(s => s.id === slateId);
      if (!slate) return;

      const duration = slateDuration(slate);
      if (duration <= 0) return;

      const fullWindow = { start: 0, end: duration };
      const compiled = compileSlate(slate, fullWindow);

      const sampleRate = 44100;
      const length = Math.ceil(sampleRate * duration);
      const offline = new OfflineAudioContext(2, length, sampleRate);

      for (const r of compiled) {
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
      useEditorStore.getState().setSlatePreviewPeaks(slateId, peaks);
    },
  };
});