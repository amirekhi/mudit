"use client";

import { useEffect, useState } from "react";
import TrackList from "@/components/editor/TrackList";
import SlateEditor from "@/components/editor/SlateEditor";
import ToolPanel from "@/components/editor/ToolPanel";
import TrackHeader from "@/components/editor/TrackHeader";
import ProjectWFE from "@/components/editor/ProjectWFE";

import { Track } from "@/store/useAudioStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useEngineStore } from "@/store/useEngineStore";

type MobileTab = "library" | "editor" | "tools";

export default function EditorPage() {
  const { slates, armedSlateIds, selectedSlateId, setLibrary, setProjectDuration } = useEditorStore();
  const isPlaying = useEngineStore(s => s.isPlaying);
  const [mobileTab, setMobileTab] = useState<MobileTab>("library");

  const selectedSlate = slates.find(s => s.id === selectedSlateId) ?? null;
  const referenceLength = slates.length ? Math.max(...slates.map(s => s.length), 30) : 30;

  useEffect(() => {
    if (!isPlaying) setProjectDuration(referenceLength);
  }, [referenceLength, isPlaying, setProjectDuration]);

  useEffect(() => {
    fetch("/api/tracks/me")
      .then(res => res.json())
      .then((tracks: Track[]) => setLibrary(tracks));
  }, [setLibrary]);

  const singleArmedIds = armedSlateIds.filter(
    id => slates.find(s => s.id === id)?.kind === "single"
  );

  // Switch to editor automatically when a track gets armed on mobile
  useEffect(() => {
    if (singleArmedIds.length > 0 && mobileTab === "library") {
      setMobileTab("editor");
    }
  }, [singleArmedIds.length]);

  const tabBtn = (tab: MobileTab, label: string, badge?: number) => (
    <button
      onClick={() => setMobileTab(tab)}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs
        font-medium transition-colors ${
        mobileTab === tab
          ? "text-indigo-400"
          : "text-neutral-500 hover:text-neutral-300"
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
        <span className="w-4 h-0.5 rounded-full bg-indigo-400" />
      )}
    </button>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════
          DESKTOP LAYOUT — unchanged from original
      ═══════════════════════════════════════════ */}
      <div className="hidden md:flex h-screen bg-neutral-950 text-white min-h-0">
        <aside className="w-80 border-r border-neutral-800 p-4 flex-shrink-0">
          <TrackList />
        </aside>

        <main className="flex-1 flex flex-col min-h-0">
          <TrackHeader slate={selectedSlate} />

          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
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

      {/* ═══════════════════════════════════════════
          MOBILE LAYOUT — tabbed single-panel view
      ═══════════════════════════════════════════ */}
      <div className="flex md:hidden flex-col h-[100dvh] bg-neutral-950 text-white overflow-hidden">

        {/* Shared header — always visible */}
        <TrackHeader slate={selectedSlate} />

        {/* Panel content — only the active tab renders */}
        <div className="flex-1 min-h-0 overflow-hidden">

          {/* Library tab */}
          <div className={`h-full overflow-y-auto p-4 ${mobileTab === "library" ? "block" : "hidden"}`}>
            <TrackList />
          </div>

          {/* Editor tab */}
          <div className={`h-full overflow-y-auto p-4 space-y-4 ${mobileTab === "editor" ? "block" : "hidden"}`}>
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
            {/* ToolPanel is a fixed-width aside — on mobile we let it fill full width */}
            <div className="w-full">
              <ToolPanel disabled={!selectedSlateId} />
            </div>
          </div>
        </div>

        {/* Bottom tab bar */}
        <div className="flex-shrink-0 flex items-stretch border-t border-neutral-800
          bg-neutral-950 h-14 safe-area-bottom">
          {tabBtn("library", "Library")}
          {tabBtn("editor", "Editor", singleArmedIds.length || undefined)}
          {tabBtn("tools", "Tools")}
        </div>
      </div>
    </>
  );
}