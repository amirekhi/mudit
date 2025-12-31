"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { useState } from "react";

export default function ToolPanel({ disabled }: { disabled: boolean }) {
  const {
    selectedTrackId,
    selectedRegionId,
    tracks,
    updateRegion,
    removeRegion,
    splitRegion,
    duplicateRegion,
    lockRegion,
    undo,
    redo,
  } = useEditorStore();

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const selectedRegion = selectedTrack?.regions.find(
    (r) => r.id === selectedRegionId
  );

  const canEdit = !!selectedTrackId && !!selectedRegionId && !disabled;

  /* ========================
     EDIT TOOLS
     ======================== */

  const applyGain = (value: number) => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        gain: (selectedRegion!.edits.gain ?? 0) + value,
      },
    });
  };

  const applyPan = (value: number) => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        pan: Math.max(-1, Math.min(1, (selectedRegion!.edits.pan ?? 0) + value)),
      },
    });
  };

  const applyPlaybackRate = (value: number) => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        playbackRate: (selectedRegion!.edits.playbackRate ?? 1) * value,
      },
    });
  };

  const applyPitch = (value: number) => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        pitch: (selectedRegion!.edits.pitch ?? 0) + value,
      },
    });
  };

  const toggleReverse = () => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        reverse: !selectedRegion!.edits.reverse,
      },
    });
  };

  const applyFadeIn = (value: number) => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        fadeIn: Math.max(0, (selectedRegion!.edits.fadeIn ?? 0) + value),
      },
    });
  };

  const applyFadeOut = (value: number) => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        fadeOut: Math.max(0, (selectedRegion!.edits.fadeOut ?? 0) + value),
      },
    });
  };

  const toggleMute = () => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        mute: !selectedRegion!.edits.mute,
      },
    });
  };

  /* ========================
     STRUCTURAL TOOLS
     ======================== */

  const splitAtMiddle = () => {
    if (!canEdit) return;
    const at = (selectedRegion!.start + selectedRegion!.end) / 2;
    splitRegion(selectedTrackId!, selectedRegionId!, at);
  };

  const duplicate = () => {
    if (!canEdit) return;
    duplicateRegion(selectedTrackId!, selectedRegionId!);
  };

  const remove = () => {
    if (!canEdit) return;
    removeRegion(selectedTrackId!, selectedRegionId!);
  };

  const toggleLock = () => {
    if (!canEdit) return;
    lockRegion(selectedTrackId!, selectedRegionId!, !selectedRegion!.meta.locked);
  };

  /* ========================
     UI
     ======================== */

  return (
    <aside className="w-64 border-l border-neutral-800 p-4 space-y-4">
      <h3 className="text-sm font-semibold">Tools</h3>

      {/* ===== Gain ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Gain</p>
        <div className="flex gap-2">
          <button
            disabled={!canEdit}
            onClick={() => applyGain(3)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            +3 dB
          </button>
          <button
            disabled={!canEdit}
            onClick={() => applyGain(-3)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            −3 dB
          </button>
        </div>
      </div>

      {/* ===== Pan ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Pan</p>
        <div className="flex gap-2">
          <button
            disabled={!canEdit}
            onClick={() => applyPan(-0.1)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            Left
          </button>
          <button
            disabled={!canEdit}
            onClick={() => applyPan(0.1)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            Right
          </button>
        </div>
      </div>

      {/* ===== Playback Rate & Pitch ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Playback / Pitch</p>
        <div className="flex gap-2">
          <button
            disabled={!canEdit}
            onClick={() => applyPlaybackRate(1.1)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            +10% Speed
          </button>
          <button
            disabled={!canEdit}
            onClick={() => applyPlaybackRate(0.9)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            −10% Speed
          </button>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            disabled={!canEdit}
            onClick={() => applyPitch(1)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            +1 Semitone
          </button>
          <button
            disabled={!canEdit}
            onClick={() => applyPitch(-1)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            −1 Semitone
          </button>
        </div>
      </div>

      {/* ===== Reverse, Fade & Mute ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Misc</p>
        <button
          disabled={!canEdit}
          onClick={toggleReverse}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
        >
          {selectedRegion?.edits.reverse ? "Unreverse" : "Reverse"}
        </button>

        <div className="flex gap-2 mt-1">
          <button
            disabled={!canEdit}
            onClick={() => applyFadeIn(0.5)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            Fade In +
          </button>
          <button
            disabled={!canEdit}
            onClick={() => applyFadeOut(0.5)}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            Fade Out +
          </button>
        </div>

        <button
          disabled={!canEdit}
          onClick={toggleMute}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
        >
          {selectedRegion?.edits.mute ? "Unmute" : "Mute"}
        </button>
      </div>

      {/* ===== Region Ops ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Region</p>

        <button
          disabled={!canEdit}
          onClick={splitAtMiddle}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
        >
          Split
        </button>

        <button
          disabled={!canEdit}
          onClick={duplicate}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
        >
          Duplicate
        </button>

        <button
          disabled={!canEdit}
          onClick={toggleLock}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
        >
          {selectedRegion?.meta.locked ? "Unlock" : "Lock"}
        </button>

        <button
          disabled={!canEdit}
          onClick={remove}
          className="w-full px-3 py-2 rounded bg-red-900/40 border border-red-800 text-sm disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {/* ===== Undo / Redo ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">History</p>
        <div className="flex gap-2">
          <button
            disabled={disabled}
            onClick={undo}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            Undo
          </button>
          <button
            disabled={disabled}
            onClick={redo}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            Redo
          </button>
        </div>
      </div>
    </aside>
  );
}
