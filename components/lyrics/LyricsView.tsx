"use client";

import { useEffect, useRef, useState } from "react";
import { useLyrics } from "@/lib/TanStackQuery/Queries/useLyrics";
import { useAudioStore } from "@/store/useAudioStore";

interface Props {
  trackId: string;
  title: string;
  artist: string;
}

export default function LyricsView({ trackId, title, artist }: Props) {
  const { data, isLoading, isError } = useLyrics(title, artist);

  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const howl = useAudioStore(s => s.howl);
  const isThisTrackPlaying = currentTrack?._id === trackId;

  const [activeIndex, setActiveIndex] = useState(-1);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const lines = data?.parsedLines ?? [];

  // Poll playback position while this track is the one actively playing,
  // and figure out which lyric line should be highlighted.
  useEffect(() => {
    if (!isThisTrackPlaying || !isPlaying || !howl || lines.length === 0) return;

    const interval = setInterval(() => {
      const currentTime = howl.seek() as number;
      let idx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].time <= currentTime) idx = i;
        else break;
      }
      setActiveIndex(idx);
    }, 150);

    return () => clearInterval(interval);
  }, [isThisTrackPlaying, isPlaying, howl, lines]);

  // Reset highlight when switching away from this track
  useEffect(() => {
    if (!isThisTrackPlaying) setActiveIndex(-1);
  }, [isThisTrackPlaying]);

  useEffect(() => {
    if (activeIndex < 0) return;
    lineRefs.current[activeIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  const handleSeek = (time: number) => {
    if (!isThisTrackPlaying || !howl) return;
    howl.seek(time);
  };

  if (isLoading) {
    return <p className="text-sm text-neutral-400 dark:text-neutral-600 italic">Looking for lyrics…</p>;
  }

  if (isError || !data?.found) {
    return <p className="text-sm text-neutral-400 dark:text-neutral-600 italic">No lyrics found for this track.</p>;
  }

  if (data.instrumental) {
    return <p className="text-sm text-neutral-400 dark:text-neutral-600 italic">This track is instrumental.</p>;
  }

  // Synced lyrics — scrollable, highlighted on the current line, clickable to seek
  if (lines.length > 0) {
    return (
      <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
        {lines.map((line, i) => (
          <p
            key={i}
            ref={el => { lineRefs.current[i] = el; }}
            onClick={() => handleSeek(line.time)}
            className={`text-sm leading-relaxed transition-colors rounded px-2 py-1 ${
              isThisTrackPlaying ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800" : ""
            } ${
              i === activeIndex
                ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {line.text || "♪"}
          </p>
        ))}
        {!isThisTrackPlaying && (
          <p className="text-xs text-neutral-400 dark:text-neutral-600 italic pt-2">
            Play this track to follow along with synced highlighting.
          </p>
        )}
      </div>
    );
  }

  // Plain lyrics fallback — LRCLIB had no timestamps for this one
  if (data.plainLyrics) {
    return (
      <div className="max-h-80 overflow-y-auto pr-1">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
          {data.plainLyrics}
        </p>
      </div>
    );
  }

  return <p className="text-sm text-neutral-400 dark:text-neutral-600 italic">No lyrics found for this track.</p>;
}