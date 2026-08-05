"use client";

import { useState } from "react";
import type { LyricLine } from "@/lib/lyrics/lrcParser";

interface Props {
  instrumental: boolean;
  plainLyrics: string | null;
  lines: LyricLine[];
}

export default function LyricsDisplay({ instrumental, plainLyrics, lines }: Props) {
  const [showTimestamps, setShowTimestamps] = useState(false);

  if (instrumental) {
    return <p className="text-sm text-neutral-400 dark:text-neutral-600 italic">This track is instrumental.</p>;
  }

  if (lines.length > 0) {
    return (
      <div>
        <button
          onClick={() => setShowTimestamps(v => !v)}
          className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 mb-3"
        >
          {showTimestamps ? "Hide" : "Show"} timestamps
        </button>
        <div className="space-y-1.5">
          {lines.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {showTimestamps && (
                <span className="text-neutral-400 dark:text-neutral-600 font-mono text-xs mr-2">
                  {formatTime(line.time)}
                </span>
              )}
              {line.text || "♪"}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (plainLyrics) {
    return (
      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
        {plainLyrics}
      </p>
    );
  }

  return <p className="text-sm text-neutral-400 dark:text-neutral-600 italic">No lyrics found.</p>;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}