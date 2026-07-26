"use client";

import { Track, useAudioStore } from "@/store/useAudioStore";
import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";

export default function VinylTrackCard({ track }: { track: Track }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isActive = currentTrack?._id === track._id;

  return (
    <div className="flex-shrink-0 w-32 max-md:w-24 flex flex-col items-center gap-2">
      <div
        onClick={() => { if (isActive) togglePlay(); else playTrack(track); }}
        className="group relative w-32 h-32 max-md:w-24 max-md:h-24 rounded-full cursor-pointer"
      >
        {/* Vinyl disc — spins while this track is the one actively playing */}
        <div
          className={`absolute inset-0 rounded-full bg-neutral-900 dark:bg-black shadow-md ${
            isActive && isPlaying ? "motion-safe:animate-[spin_4s_linear_infinite]" : ""
          }`}
        >
          <div className="absolute inset-[10%] rounded-full overflow-hidden ring-4 ring-neutral-800 dark:ring-neutral-950">
            <img src={track.image || "/test.jpg"} alt={track.title} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-[46%] rounded-full bg-amber-400" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
            {isActive && isPlaying ? (
              <IconPlayerPause className="w-4 h-4 text-white" />
            ) : (
              <IconPlayerPlay className="w-4 h-4 text-white" />
            )}
          </div>
        </div>
      </div>

      <div className="text-center w-full">
        <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">{track.title}</p>
        <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate">{track.artist}</p>
      </div>
    </div>
  );
}