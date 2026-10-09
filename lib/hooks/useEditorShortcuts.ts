"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import { useTimelineStore } from "@/store/useTimelineStore";

export interface LoopTarget {
  slateId: string;
  start: number;
  end: number;
  kind: "selection" | "region";
}

/**
 * What Loop applies to: the green selection if there is one, otherwise the selected region,
 * otherwise nothing (then it loops the whole slate or project).
 */
export function getLoopTarget(): LoopTarget | null {
  const editor = useEditorStore.getState();

  const selection = useTimelineStore.getState().selectionRange;
  if (selection && selection.end - selection.start >= 0.05 && editor.slates.some(s => s.id === selection.slateId)) {
    return { slateId: selection.slateId, start: selection.start, end: selection.end, kind: "selection" };
  }

  const slate = editor.slates.find(s => s.id === editor.selectedSlateId);
  const region = slate?.regions.find(r => r.id === editor.selectedRegionId);
  if (slate && region && region.end - region.start >= 0.05) {
    return { slateId: slate.id, start: region.start, end: region.end, kind: "region" };
  }
  return null;
}

// Plays the target; starts at the playhead if it is inside the range, otherwise at the range start
function playTarget(target: LoopTarget) {
  const time = useEditorStore.getState().transport.time;
  const from = time >= target.start && time < target.end - 0.01 ? time : target.start;
  void useEngineStore.getState().playRange(target.slateId, target.start, target.end, from);
}

/**
 * Play / pause. With Loop on and a selection or region marked, plays and loops just that.
 * Otherwise plays the selected slate, or the whole project.
 */
export function togglePlayback() {
  const engine = useEngineStore.getState();
  if (engine.isPlaying) {
    void engine.pause();
    return;
  }

  const target = useTimelineStore.getState().loop ? getLoopTarget() : null;
  if (target) {
    playTarget(target);
    return;
  }

  if (engine.currentSlateIds.length > 0) {
    void engine.resume();
    return;
  }
  const editor = useEditorStore.getState();
  const selected = editor.slates.find(s => s.id === editor.selectedSlateId);
  if (selected) void engine.playSlate(selected.id);
  else if (editor.slates.some(s => s.kind === "project")) void engine.playProject();
}

/**
 * Loop on/off. If something is playing it restarts so the change takes effect: turning Loop on
 * while a selection or region is marked switches to looping just that.
 */
export function toggleLoopAndRestart() {
  useTimelineStore.getState().toggleLoop();
  const engine = useEngineStore.getState();
  if (!engine.isPlaying) return;

  const target = useTimelineStore.getState().loop ? getLoopTarget() : null;
  if (target) playTarget(target);
  else void engine.seekTo(useEditorStore.getState().transport.time);
}

function isTextTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return true;
  if (el.tagName === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return !["range", "checkbox", "radio", "button"].includes(type);
  }
  return false;
}

// Buttons and sliders use Space / Enter / arrows themselves
function isControlTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "BUTTON" || el.tagName === "INPUT");
}

/**
 * Space play/pause · S split at playhead · Delete remove region · Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y undo/redo
 * Ctrl+C / X / V copy/cut/paste · L loop (the selection or selected region, else everything) · + / - / 0 zoom in/out/fit · Home to start
 * Left / Right nudge playhead (Shift = 1s) · Esc deselect
 */
export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTextTarget(e.target)) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key;
      const lower = key.toLowerCase();
      const control = isControlTarget(e.target);

      const editor = useEditorStore.getState();
      const engine = useEngineStore.getState();
      const timeline = useTimelineStore.getState();

      const refLen = editor.slates.length ? Math.max(...editor.slates.map(s => s.length), 30) : 30;
      const time = editor.transport.time;
      const slateId = editor.selectedSlateId;
      const regionId = editor.selectedRegionId;
      const region = editor.slates.find(s => s.id === slateId)?.regions.find(r => r.id === regionId);
      const hasTextSelection = !!window.getSelection()?.toString();

      if (mod) {
        if (lower === "z") {
          e.preventDefault();
          if (e.shiftKey) editor.redo();
          else editor.undo();
        } else if (lower === "y") {
          e.preventDefault();
          editor.redo();
        } else if (lower === "c" && slateId && region && !hasTextSelection) {
          e.preventDefault();
          editor.copyRegion(slateId, region.id);
        } else if (lower === "x" && slateId && region && !hasTextSelection) {
          e.preventDefault();
          editor.cutRegion(slateId, region.id);
        } else if (lower === "v" && editor.clipboard) {
          const target = slateId ?? editor.slates.find(s => s.kind === "project")?.id;
          if (target) {
            e.preventDefault();
            editor.pasteRegion(target, time);
          }
        }
        return;
      }

      switch (key) {
        case " ":
          if (control) return;
          e.preventDefault();
          togglePlayback();
          return;
        case "Delete":
        case "Backspace":
          if (slateId && region) {
            e.preventDefault();
            editor.removeRegion(slateId, region.id);
          }
          return;
        case "Home":
          e.preventDefault();
          void engine.seekTo(0);
          return;
        case "ArrowLeft":
        case "ArrowRight": {
          if (control) return;
          e.preventDefault();
          const step = (e.shiftKey ? 1 : 0.1) * (key === "ArrowLeft" ? -1 : 1);
          void engine.seekTo(Math.max(0, time + step));
          return;
        }
        case "Escape":
          editor.selectRegion(null);
          return;
        case "+":
        case "=":
          e.preventDefault();
          timeline.zoomBy(1.25, refLen);
          return;
        case "-":
        case "_":
          e.preventDefault();
          timeline.zoomBy(0.8, refLen);
          return;
        case "0":
          e.preventDefault();
          timeline.setFit();
          return;
      }

      if (lower === "s" && slateId && region && time > region.start + 0.01 && time < region.end - 0.01) {
        e.preventDefault();
        editor.splitRegion(slateId, region.id, time);
      } else if (lower === "l") {
        e.preventDefault();
        toggleLoopAndRestart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
