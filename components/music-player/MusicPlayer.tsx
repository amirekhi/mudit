"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IconX,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconVolume,
  IconArrowsShuffle,
} from "@tabler/icons-react";

import { useAudioStore } from "@/store/useAudioStore";
import { usePlaylistStore } from "@/store/usePlaylistStore";

export default function EnhancedMusicPlayer({ onClose }: { onClose?: () => void }) {
  const {
    currentTrack,
    isPlaying,
    volume,
    togglePlay,
    setVolume,
    howl,
    unload,
  } = useAudioStore();

  const {currentPlaylist , nextTrack, prevTrack} = usePlaylistStore();

  const [progress, setProgress] = useState(0);

  const handlePrevTrack = () => {
    prevTrack();
  }

  const handleNextTrack = () => {
    nextTrack();
  }

  // Update progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (howl && isPlaying) {
      interval = setInterval(() => {
        const current = howl.seek() as number;
        const duration = howl.duration();
        setProgress(current / duration);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [howl, isPlaying]);

  const handleClose = () => {
    unload();
    if (onClose) onClose();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (howl) {
      const duration = howl.duration();
      const newTime = Number(e.target.value) * duration;
      howl.seek(newTime);
      setProgress(Number(e.target.value));
    }
  };

  return (
    <motion.div
      initial={{ height: "80px", opacity: 1 }}
      animate={{
        height: currentTrack ? "80px" : 0,
        opacity: currentTrack ? 1 : 0,
      }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden bg-neutral-800 text-white w-full flex rounded-full m-1 flex-col md:flex-row items-center justify-between px-4 md:px-8 shadow-lg"
    >
      {/* Track Info */}
      <div className="flex flex-row max-md:flex-row max-md:items-center max-md:text-sm max-md:gap-4 justify-start md:flex-1 max-md:pt-2 min-w-0">
        <div className="flex-col flex">
        <span className="font-semibold text-lg truncate">{currentTrack?.title ?? "No Track"}</span>
        {currentTrack?.artist && <span className="text-sm text-gray-400 truncate">{currentTrack.artist}</span>}
        </div>
        <div className="w-16 h-16 ml-12">
          {currentTrack?.image && <img src={currentTrack.image} alt={currentTrack.title} className="w-full h-full object-cover rounded-md" />}
        </div>
      </div>

      {/* Progress Bar */}
      {currentTrack && (
        <div className="flex flex-col flex-1 md:flex-none w-full md:w-64 mx-4">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1 accent-indigo-500"
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 mt-2 md:mt-0 max-md:flex-1">
        <button className="p-2 hover:bg-neutral-700 rounded-full transition-colors">
          <IconArrowsShuffle className="w-5 h-5" />
        </button>

        <button
          onClick={handlePrevTrack}
          className={`p-2 rounded-full transition-colors ${currentPlaylist ? "hover:bg-neutral-700" : "opacity-40 cursor-not-allowed"}`}
        >
          <IconPlayerSkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlay}
          className="p-3 bg-neutral-700 hover:bg-neutral-600 rounded-full transition-colors"
        >
          {isPlaying ? <IconPlayerPause className="w-6 h-6" /> : <IconPlayerPlay className="w-6 h-6" />}
        </button>

        <button
          onClick={handleNextTrack}
          className={`p-2 rounded-full transition-colors ${currentPlaylist ? "hover:bg-neutral-700" : "opacity-40 cursor-not-allowed"}`}
        >
          <IconPlayerSkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 mt-2 md:mt-0 w-32 md:w-40 max-md:hidden">
        <IconVolume className="w-5 h-5" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full h-1 accent-indigo-500"
        />
      </div>

      {/* Close */}
      <div className="ml-2 max-md:hidden">
        <button onClick={handleClose} className="p-2 rounded-full hover:bg-neutral-700 transition-colors">
          <IconX className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
