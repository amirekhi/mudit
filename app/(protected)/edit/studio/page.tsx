"use client";

import { useEffect, useMemo, useState } from "react";
import TrackList from "@/components/editor/TrackList";
import SlateEditor from "@/components/editor/SlateEditor";
import ToolPanel from "@/components/editor/ToolPanel";
import TrackHeader from "@/components/editor/TrackHeader";
import ProjectWFE from "@/components/editor/ProjectWFE";
import ThemeToggle from "@/components/basics/ThemeToggle";
import ProjectBar from "@/components/editor/ProjectBar";
import TimelineToolbar from "@/components/editor/TimelineToolbar";
import { useEditorShortcuts } from "@/lib/hooks/useEditorShortcuts";
import { useIsDesktop } from "@/lib/hooks/useMediaQuery";

import { Track } from "@/store/useAudioStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";

type MobileTab = "library" | "editor" | "tools";

export default function EditorPage() {
  // Selectors instead of useEditorStore(): the page used to subscribe to the WHOLE store and
  // re-render the entire editor on every animation frame during playback.
  const slates          = useEditorStore(s => s.slates);
  const armedSlateIds   = useEditorStore(s => s.armedSlateIds);
  const selectedSlateId = useEditorStore(s => s.selectedSlateId);
  const isPlaying       = useEngineStore(s => s.isPlaying);

  // One layout is mounted, not both. `hidden md:flex` only hid the other one with CSS, so every
  // TrackList, SlateEditor, ToolPanel and WaveSurfer existed twice (and rendered previews twice).
  const isDesktop = useIsDesktop();
  useEditorShortcuts(); // Space, S, Delete, Ctrl+Z, L, zoom keys...
  const [mobileTab, setMobileTab] = useState<MobileTab>("library");

  const selectedSlate = slates.find(s => s.id === selectedSlateId) ?? null;
  const referenceLength = useMemo(
    () => (slates.length ? Math.max(...slates.map(s => s.length), 30) : 30),
    [slates]
  );

  useEffect(() => {
    if (!isPlaying) useEditorStore.getState().setProjectDuration(referenceLength);
  }, [referenceLength, isPlaying]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tracks/me")
      .then(res => {
        if (!res.ok) throw new Error(`Library request failed (${res.status})`);
        return res.json();
      })
      .then((tracks: Track[]) => {
        if (!cancelled && Array.isArray(tracks)) useEditorStore.getState().setLibrary(tracks);
      })
      .catch(err => console.error("Failed to load library:", err));
    return () => { cancelled = true; };
  }, []);

  const singleArmedIds = useMemo(
    () => armedSlateIds.filter(id => slates.find(s => s.id === id)?.kind === "single"),
    [armedSlateIds, slates]
  );

  // Switch to editor automatically when a track gets armed on mobile
  // (deliberately depends on the count only, so the user can still go back to the Library tab)
  useEffect(() => {
    if (singleArmedIds.length > 0 && mobileTab === "library") {
      setMobileTab("editor");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleArmedIds.length]);

  const tabBtn = (tab: MobileTab, label: string, badge?: number) => (
    <button
      onClick={() => setMobileTab(tab)}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs
        font-medium transition-colors ${
        mobileTab === tab
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      }`}
    >
      <span className="relative">
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-3 bg-indigo-500 text-white text-[9px]
            rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {badge}
          </span>
        )}
      </span>
      {mobileTab === tab && (
        <span className="w-4 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
      )}
    </button>
  );

  /* ═══════════════ DESKTOP LAYOUT ═══════════════ */
  if (isDesktop) {
    return (
      <div className="flex h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white min-h-0 transition-colors">
        <aside className="w-80 border-r border-neutral-200 dark:border-neutral-800 p-4 flex-shrink-0">
          <TrackList />
        </aside>

        <main className="flex-1 flex flex-col min-h-0">
          <ProjectBar />

          <div className="flex items-center">
            <div className="flex-1 min-w-0">
              <TrackHeader slate={selectedSlate} />
            </div>
            <div className="flex-shrink-0 px-4 border-b border-neutral-200 dark:border-neutral-800 h-full flex items-center">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
              {slates.length > 0 && <TimelineToolbar referenceLength={referenceLength} />}

              {singleArmedIds.length === 0 && (
                <div className="text-neutral-500 text-center py-10">
                  Arm a track to start editing
                </div>
              )}

              {singleArmedIds.map(slateId => (
                <SlateEditor key={slateId} slateId={slateId} referenceLength={referenceLength} />
              ))}

              <ProjectWFE referenceLength={referenceLength} />
            </div>

            <ToolPanel disabled={!selectedSlateId} />
          </div>
        </main>
      </div>
    );
  }

  /* ═══════════════ MOBILE LAYOUT: tabbed single-panel view ═══════════════ */
  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-hidden transition-colors">

      <ProjectBar />

      {/* Shared header: always visible */}
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <TrackHeader slate={selectedSlate} />
        </div>
        <div className="flex-shrink-0 px-3 border-b border-neutral-200 dark:border-neutral-800 h-full flex items-center">
          <ThemeToggle />
        </div>
      </div>

      {/* Panel content: only the active tab is visible (the other panels stay mounted so their state survives) */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* Library tab */}
        <div className={`h-full overflow-y-auto p-4 ${mobileTab === "library" ? "block" : "hidden"}`}>
          <TrackList />
        </div>

        {/* Editor tab */}
        <div className={`h-full overflow-y-auto p-4 space-y-4 ${mobileTab === "editor" ? "block" : "hidden"}`}>
          {slates.length > 0 && <TimelineToolbar referenceLength={referenceLength} />}

          {singleArmedIds.length === 0 && (
            <div className="text-neutral-500 text-center py-16 text-sm">
              ← Go to Library and arm a track to start editing
            </div>
          )}

          {singleArmedIds.map(slateId => (
            <SlateEditor key={slateId} slateId={slateId} referenceLength={referenceLength} />
          ))}

          <ProjectWFE referenceLength={referenceLength} />
        </div>

        {/* Tools tab */}
        <div className={`h-full overflow-y-auto ${mobileTab === "tools" ? "block" : "hidden"}`}>
          <div className="w-full">
            <ToolPanel disabled={!selectedSlateId} />
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <div className="flex-shrink-0 flex items-stretch border-t border-neutral-200 dark:border-neutral-800
        bg-white dark:bg-neutral-950 h-14 safe-area-bottom transition-colors">
        {tabBtn("library", "Library")}
        {tabBtn("editor", "Editor", singleArmedIds.length || undefined)}
        {tabBtn("tools", "Tools")}
      </div>
    </div>
  );
}
