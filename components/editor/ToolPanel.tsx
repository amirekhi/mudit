"use client";

import { useEditorStore,  } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";
import { shallow } from "zustand/shallow";

export default function ToolPanel({ disabled }: { disabled: boolean }) {
  const {
    selectedTrackId,
    selectedRegionId,
    tracks,

    updateRegionVisuals,
    updateRegionPlaybackRate,
    updateRegion,
    removeRegion,
    splitRegion,
    duplicateRegion,
    lockRegion,

    copyRegion,
    cutRegion,
    pasteRegion,
    clipboard,

    undo,
    redo,
  } = useEditorStore();




const masterVolume = useEditorStore((state) => state.master.volume);
const masterMuted = useEditorStore((state) => state.master.muted);
const limiterEnabled = useEditorStore((state) => state.master.limiter.enabled);
const limiterCeiling = useEditorStore((state) => state.master.limiter.ceiling);

const setMasterVolume = useEditorStore((state) => state.setMasterVolume);
const toggleMasterMute = useEditorStore((state) => state.toggleMasterMute);
const setLimiterEnabled = useEditorStore((state) => state.setLimiterEnabled);
const setLimiterCeiling = useEditorStore((state) => state.setLimiterCeiling);


  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const selectedRegion = selectedTrack?.regions.find(
    (r) => r.id === selectedRegionId
  );

  const canEdit =
    !!selectedTrackId && !!selectedRegionId && !disabled;

  /* ========================
     EDIT HELPERS
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
  if (!selectedTrackId || !selectedRegionId) return;

  updateRegionPlaybackRate(
    selectedTrackId,
    selectedRegionId,
    value
  );

  updateRegionVisuals(selectedTrackId);
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
        fadeIn: Math.max(
          0,
          (selectedRegion!.edits.fadeIn ?? 0) + value
        ),
      },
    });
  };

  const applyFadeOut = (value: number) => {
    if (!canEdit) return;
    updateRegion(selectedTrackId!, selectedRegionId!, {
      edits: {
        fadeOut: Math.max(
          0,
          (selectedRegion!.edits.fadeOut ?? 0) + value
        ),
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
     STRUCTURAL OPS
     ======================== */

  const splitAtMiddle = () => {
    if (!canEdit) return;
    const at =
      (selectedRegion!.start + selectedRegion!.end) / 2;
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
    lockRegion(
      selectedTrackId!,
      selectedRegionId!,
      !selectedRegion!.meta.locked
    );
  };

  /* ========================
     CLIPBOARD OPS
     ======================== */

  const copy = () => {
    if (!canEdit) return;
    copyRegion(selectedTrackId!, selectedRegionId!);
  };

  const cut = () => {
    if (!canEdit) return;
    cutRegion(selectedTrackId!, selectedRegionId!);
  };

  const paste = () => {
    if (!selectedTrackId || !clipboard) return;

    // paste at end of selected region or at 0
    const at =
      selectedRegion?.end ??
      selectedTrack?.regions.at(-1)?.end ??
      0;

    pasteRegion(selectedTrackId, at);
  };

  /* ========================
     UI
     ======================== */

  return (
    <aside className="w-64 border-l border-neutral-800 p-4 space-y-4">
      <h3 className="text-sm font-semibold">Tools</h3>

      {/* ===== Clipboard ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Clipboard</p>

        <div className="flex gap-2">
          <button
            disabled={!canEdit}
            onClick={copy}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            Copy
          </button>
          <button
            disabled={!canEdit}
            onClick={cut}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
          >
            Cut
          </button>
        </div>

        <button
          disabled={!clipboard || disabled}
          onClick={paste}
          className="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm disabled:opacity-50"
        >
          Paste
        </button>
      </div>

      {/* ===== Gain ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Gain</p>
        <p className="text-xs">{selectedRegion?.edits.gain ?? 0} dB</p>
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
        <p className="text-xs">{selectedRegion?.edits.pan} pan</p>
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

      {/* ===== Playback / Pitch ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Playback / Pitch</p>
        <p className="text-xs">{selectedRegion?.edits.playbackRate ?? 1}x</p>
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

        <div className="flex flex-col gap-2 mt-4">
          <p className="text-xs">{selectedRegion?.edits.pitch ?? 0} semitones</p>
          <div className="flex gap-2">
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
      </div>

      {/* ===== Region ===== */}
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
      {/* ===== Master Volume ===== */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Master</p>

        {/* Volume Slider */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => setMasterVolume(Number(e.target.value))}
            disabled={disabled}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">{Math.round(masterVolume * 100)}%</span>
        </div>

        {/* Mute Button */}
        <button
          disabled={disabled}
          onClick={toggleMasterMute}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-50"
        >
          {masterMuted ? "Unmute" : "Mute"}
        </button>

        {/* Limiter Enabled */}
        <div className="flex gap-2 items-center mt-1">
          <label className="text-xs text-neutral-500">Limiter</label>
          <input
            type="checkbox"
            checked={limiterEnabled}
            onChange={(e) => setLimiterEnabled(e.target.checked)}
            disabled={disabled}
            className="ml-auto"
          />
        </div>

        {/* Limiter Ceiling */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-neutral-500">Ceiling</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={limiterCeiling}
            onChange={(e) => setLimiterCeiling(Number(e.target.value))}
            disabled={disabled}
            className="flex-1"
          />
          <span className="text-xs w-12 text-right">{Math.round(limiterCeiling * 100)}%</span>
        </div>
      </div>



      {/* ===== History ===== */}
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
