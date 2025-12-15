"use client";

import { Track, useAudioStore } from "@/store/useAudioStore";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { IconPlayerPlay, IconPlayerPause, IconX } from "@tabler/icons-react";

interface PlaylistTrackProps {
  track: Track;
  index: number;
  idx: number;
  removeTrack: (id: string) => void;
}

export default function PlaylistTrack({ track, removeTrack , idx }: PlaylistTrackProps) {
  // Selector: this track's playing status
  const isPlaying = useAudioStore(
    (state) => state.currentTrack?._id === track._id && state.isPlaying
  );


  // Functions from the store
  const togglePlay = useAudioStore((state) => state.togglePlay);
  const playTrack = usePlaylistStore((state) => state.playTrack);
  const handlePlayPause = () => {
    if (isPlaying) togglePlay();
    else {
      playTrack(idx);
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
        isPlaying ? "bg-neutral-700" : "bg-neutral-800 hover:bg-neutral-700/50"
      }`}
    >
      {/* Left: Track info */}
      <div className="flex items-center gap-2" onClick={handlePlayPause}>
        {track.image && (
          <img src={track.image} alt={track.title} className="w-10 h-10 rounded" />
        )}
        <div className="flex flex-col">
          <span className="text-white font-medium">{track.title}</span>
          <span className="text-sm text-neutral-400">{track.artist}</span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
          className="p-1 rounded hover:bg-neutral-700 transition-colors"
        >
          {isPlaying ? (
            <IconPlayerPause className="w-5 h-5 text-white" />
          ) : (
            <IconPlayerPlay className="w-5 h-5 text-white" />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            removeTrack(track._id);
          }}
          className="p-1 rounded hover:bg-red-700 transition-colors"
        >
          <IconX className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}
