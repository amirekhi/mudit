"use client";

import { useEditorStore } from "@/store/useEditorStore";
import type { SlateRegion } from "@/types/slateTypes";

// Actions are stable, so handlers read them from getState(). The panel only subscribes to the
// few values it displays; before, it subscribed to the WHOLE store and re-rendered every frame.
const ed = () => useEditorStore.getState();

/** Own component so only this button follows the playhead. */
function SplitAtPlayheadButton({
  slateId, region, enabled, className,
}: { slateId: string | null; region: SlateRegion | undefined; enabled: boolean; className: string }) {
  const time = useEditorStore(s => s.transport.time);
  const inside = !!region && time > region.start + 0.01 && time < region.end - 0.01;

  return (
    <button
      disabled={!enabled || !inside}
      onClick={() => { if (slateId && region) ed().splitRegion(slateId, region.id, time); }}
      title={inside ? "Split the selected region at the playhead (S)" : "Move the playhead inside the region to split it"}
      className={className}
    >
      Split
    </button>
  );
}

/** A labelled slider with a value readout and a reset button. One undo step per drag. */
function SliderRow({
  label, display, value, min, max, step, disabled, onChange, onReset,
}: {
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-600 dark:text-neutral-300 tabular-nums">{display}</span>
          <button
            disabled={disabled}
            onClick={onReset}
            title="Reset"
            className="text-[11px] leading-none text-neutral-400 hover:text-neutral-700 dark:hover:text-white disabled:opacity-30"
          >
            ↺
          </button>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        onPointerUp={e => e.currentTarget.blur()} // so keyboard shortcuts work again right after a drag
        className="w-full accent-indigo-500 disabled:opacity-40"
      />
    </div>
  );
}

export default function ToolPanel({ disabled }: { disabled: boolean }) {
  const selectedSlateId  = useEditorStore(s => s.selectedSlateId);
  const selectedRegionId = useEditorStore(s => s.selectedRegionId);
  const selectedRegion   = useEditorStore(s =>
    s.slates.find(sl => sl.id === s.selectedSlateId)?.regions.find(r => r.id === s.selectedRegionId)
  );
  const clipboard        = useEditorStore(s => s.clipboard);

  const masterVolume   = useEditorStore(s => s.master.volume);
  const masterMuted    = useEditorStore(s => s.master.muted);
  const limiterEnabled = useEditorStore(s => s.master.limiter.enabled);
  const limiterCeiling = useEditorStore(s => s.master.limiter.ceiling);

  const canEdit = !!selectedSlateId && !!selectedRegionId && !!selectedRegion && !disabled;
  const repClip = selectedRegion?.clips[0];

  const gain  = repClip?.edits.gain ?? 0;
  const pan   = repClip?.edits.pan ?? 0;
  const speed = repClip?.edits.playbackRate ?? 1;
  const fadeIn  = repClip?.edits.fadeIn ?? 0;
  const fadeOut = repClip?.edits.fadeOut ?? 0;

  const setEdits = (patch: Parameters<ReturnType<typeof ed>["setRegionEdits"]>[2]) =>
    canEdit && ed().setRegionEdits(selectedSlateId!, selectedRegionId!, patch);
  const setSpeed = (rate: number) => canEdit && ed().setRegionSpeed(selectedSlateId!, selectedRegionId!, rate);

  const toggleReverse = () => canEdit && ed().toggleRegionReverse(selectedSlateId!, selectedRegionId!);
  const toggleMute    = () => canEdit && ed().toggleRegionMute(selectedSlateId!, selectedRegionId!);
  const duplicate  = () => canEdit && ed().duplicateRegion(selectedSlateId!, selectedRegionId!);
  const remove     = () => canEdit && ed().removeRegion(selectedSlateId!, selectedRegionId!);
  const toggleLock = () => canEdit && ed().lockRegion(selectedSlateId!, selectedRegionId!, !selectedRegion!.meta.locked);
  const copy       = () => canEdit && ed().copyRegion(selectedSlateId!, selectedRegionId!);
  const cut        = () => canEdit && ed().cutRegion(selectedSlateId!, selectedRegionId!);
  const paste      = () => {
    if (!selectedSlateId || !clipboard) return;
    ed().pasteRegion(selectedSlateId, ed().transport.time);
  };

  // Reusable button classes
  const btn  = "flex-1 px-2 py-2 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-200 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors";
  const label = "text-[10px] text-neutral-500 font-medium uppercase tracking-wide mb-1.5";

  return (
    <aside className="
      md:w-64 w-full
      border-l border-neutral-200 dark:border-neutral-800
      bg-neutral-50 dark:bg-neutral-950
      overflow-y-auto
    ">
      {/* On desktop: single-column list (original feel).
          On mobile: 2-column grid of cards so everything fits without endless scrolling. */}
      <div className="p-3 md:p-4 grid grid-cols-2 md:grid-cols-1 gap-3">

        {/* ── Clipboard ── */}
        <div className="col-span-2 md:col-span-1 space-y-1.5">
          <p className={label}>Clipboard</p>
          <div className="flex gap-1.5">
            <button disabled={!canEdit} onClick={copy} className={btn}>Copy</button>
            <button disabled={!canEdit} onClick={cut}  className={btn}>Cut</button>
          </div>
          <button
            disabled={!clipboard || disabled}
            onClick={paste}
            className="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white disabled:opacity-40 transition-colors"
          >
            Paste at Playhead
          </button>
        </div>

        {/* ── Sliders for the selected region (absolute values, one undo step per drag) ── */}
        <div className="col-span-2 md:col-span-1 space-y-3">
          <p className={label}>Selected region</p>
          <SliderRow
            label="Gain" display={`${gain > 0 ? "+" : ""}${gain.toFixed(1)} dB`}
            value={gain} min={-24} max={24} step={0.5} disabled={!canEdit}
            onChange={v => setEdits({ gain: v })} onReset={() => setEdits({ gain: 0 })}
          />
          <SliderRow
            label="Pan" display={pan === 0 ? "C" : `${pan < 0 ? "L" : "R"} ${Math.round(Math.abs(pan) * 100)}`}
            value={pan} min={-1} max={1} step={0.05} disabled={!canEdit}
            onChange={v => setEdits({ pan: v })} onReset={() => setEdits({ pan: 0 })}
          />
          <SliderRow
            label="Speed" display={`${speed.toFixed(2)}×`}
            value={speed} min={0.25} max={4} step={0.05} disabled={!canEdit}
            onChange={setSpeed} onReset={() => setSpeed(1)}
          />
          <SliderRow
            label="Fade in" display={`${fadeIn.toFixed(1)} s`}
            value={fadeIn} min={0} max={10} step={0.1} disabled={!canEdit}
            onChange={v => setEdits({ fadeIn: v })} onReset={() => setEdits({ fadeIn: 0 })}
          />
          <SliderRow
            label="Fade out" display={`${fadeOut.toFixed(1)} s`}
            value={fadeOut} min={0} max={10} step={0.1} disabled={!canEdit}
            onChange={v => setEdits({ fadeOut: v })} onReset={() => setEdits({ fadeOut: 0 })}
          />
        </div>

        {/* ── Pitch: disabled until time-stretch support exists (it never produced any sound) ── */}
        <div className="space-y-1.5">
          <p className={label}>Pitch</p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Coming soon</p>
          <div className="flex gap-1.5">
            <button disabled title="Pitch shifting needs a time-stretch step and is not available yet" className={btn}>+1 st</button>
            <button disabled title="Pitch shifting needs a time-stretch step and is not available yet" className={btn}>−1 st</button>
          </div>
        </div>

        {/* ── Reverse / Mute ── */}
        <div className="space-y-1.5">
          <p className={label}>Audio</p>
          <div className="flex gap-1.5">
            <button disabled={!canEdit} onClick={toggleReverse} className={btn}>
              {repClip?.edits.reverse ? "Un-rev" : "Reverse"}
            </button>
            <button disabled={!canEdit} onClick={toggleMute} className={btn}>
              {repClip?.edits.mute ? "Unmute" : "Mute"}
            </button>
          </div>
        </div>

        {/* ── Region ops ── */}
        <div className="col-span-2 md:col-span-1 space-y-1.5">
          <p className={label}>Region</p>
          <div className="grid grid-cols-3 gap-1.5">
            <SplitAtPlayheadButton slateId={selectedSlateId} region={selectedRegion} enabled={canEdit} className={btn} />
            <button disabled={!canEdit} onClick={duplicate}  className={btn}>Dupe</button>
            <button disabled={!canEdit} onClick={toggleLock} className={btn}>
              {selectedRegion?.meta.locked ? "Unlock" : "Lock"}
            </button>
          </div>
          <button
            disabled={!canEdit}
            onClick={remove}
            className="w-full px-3 py-2 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-xs text-red-600 dark:text-red-300 disabled:opacity-40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            Delete Region
          </button>
        </div>

        {/* ── Master (wired to the engine and the export) ── */}
        <div className="col-span-2 md:col-span-1 space-y-2">
          <p className={label}>Master</p>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={1} step={0.01}
              value={masterVolume}
              onChange={e => ed().setMasterVolume(Number(e.target.value))}
              onPointerUp={e => e.currentTarget.blur()}
              disabled={disabled}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-400 w-10 text-right flex-shrink-0">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              disabled={disabled}
              onClick={() => ed().toggleMasterMute()}
              className={`${btn} flex-1`}
            >
              {masterMuted ? "Unmute" : "Mute"}
            </button>
            <label
              title="Soft limiter on the master output"
              className="flex items-center gap-1.5 px-2 py-2 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-200 cursor-pointer"
            >
              <span className="text-neutral-500">Limiter</span>
              <input
                type="checkbox"
                checked={limiterEnabled}
                onChange={e => ed().setLimiterEnabled(e.target.checked)}
                disabled={disabled}
                className="accent-indigo-500"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 flex-shrink-0">Ceiling</span>
            <input
              type="range" min={0.5} max={1} step={0.01}
              value={limiterCeiling}
              onChange={e => ed().setLimiterCeiling(Number(e.target.value))}
              onPointerUp={e => e.currentTarget.blur()}
              disabled={disabled || !limiterEnabled}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 w-10 text-right flex-shrink-0">
              {Math.round(limiterCeiling * 100)}%
            </span>
          </div>
        </div>

        {/* ── History ── */}
        <div className="col-span-2 md:col-span-1 space-y-1.5">
          <p className={label}>History</p>
          <div className="flex gap-1.5">
            <button disabled={disabled} onClick={() => ed().undo()} className={btn}>↩ Undo</button>
            <button disabled={disabled} onClick={() => ed().redo()} className={btn}>↪ Redo</button>
          </div>
        </div>

      </div>
    </aside>
  );
}
