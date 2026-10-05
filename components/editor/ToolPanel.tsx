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
      title={inside ? "Split the selected region at the playhead" : "Move the playhead inside the region to split it"}
      className={className}
    >
      Split
    </button>
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

  const applyGain         = (v: number) => canEdit && ed().applyRegionGain(selectedSlateId!, selectedRegionId!, v);
  const applyPan          = (v: number) => canEdit && ed().applyRegionPan(selectedSlateId!, selectedRegionId!, v);
  const applyPlaybackRate = (v: number) => canEdit && ed().applyRegionPlaybackRate(selectedSlateId!, selectedRegionId!, v);
  const toggleReverse     = ()          => canEdit && ed().toggleRegionReverse(selectedSlateId!, selectedRegionId!);
  const applyFadeIn       = (v: number) => canEdit && ed().applyRegionFadeIn(selectedSlateId!, selectedRegionId!, v);
  const applyFadeOut      = (v: number) => canEdit && ed().applyRegionFadeOut(selectedSlateId!, selectedRegionId!, v);
  const toggleMute        = ()          => canEdit && ed().toggleRegionMute(selectedSlateId!, selectedRegionId!);
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

        {/* ── Gain ── */}
        <div className="space-y-1.5">
          <p className={label}>Gain</p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{repClip?.edits.gain ?? 0} dB</p>
          <div className="flex gap-1.5">
            <button disabled={!canEdit} onClick={() => applyGain(3)}  className={btn}>+3 dB</button>
            <button disabled={!canEdit} onClick={() => applyGain(-3)} className={btn}>−3 dB</button>
          </div>
        </div>

        {/* ── Pan ── */}
        <div className="space-y-1.5">
          <p className={label}>Pan</p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{repClip?.edits.pan ?? 0}</p>
          <div className="flex gap-1.5">
            <button disabled={!canEdit} onClick={() => applyPan(-0.1)} className={btn}>◀ L</button>
            <button disabled={!canEdit} onClick={() => applyPan(0.1)}  className={btn}>R ▶</button>
          </div>
        </div>

        {/* ── Speed (varispeed: changes tempo AND pitch together) ── */}
        <div className="space-y-1.5">
          <p className={label}>Speed</p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{repClip?.edits.playbackRate ?? 1}×</p>
          <div className="flex gap-1.5">
            <button disabled={!canEdit} onClick={() => applyPlaybackRate(1.1)} className={btn}>+10%</button>
            <button disabled={!canEdit} onClick={() => applyPlaybackRate(0.9)} className={btn}>−10%</button>
          </div>
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

        {/* ── Fades ── */}
        <div className="space-y-1.5">
          <p className={label}>Fades</p>
          <div className="flex gap-1.5">
            <button disabled={!canEdit} onClick={() => applyFadeIn(0.5)}  className={btn}>In +0.5s</button>
            <button disabled={!canEdit} onClick={() => applyFadeOut(0.5)} className={btn}>Out +0.5s</button>
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

        {/* ── Master (now actually wired to the engine and the export) ── */}
        <div className="col-span-2 md:col-span-1 space-y-2">
          <p className={label}>Master</p>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={1} step={0.01}
              value={masterVolume}
              onChange={e => ed().setMasterVolume(Number(e.target.value))}
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
