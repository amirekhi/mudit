"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  IconX,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconVolume,
  IconRepeat,
  IconArrowsShuffle,
} from "@tabler/icons-react";

interface MusicPlayerProps {
  trackName: string;
  artist?: string;
  onClose?: () => void;
}

export default function EnhancedMusicPlayer({ trackName, artist, onClose }: MusicPlayerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  return (
    <motion.div
      initial={{ height: "120px", opacity: 1 }}
      animate={{ height: isOpen ? "120px" : 0, opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden bg-neutral-800 text-white w-full flex rounded-full m-1   flex-col md:flex-row items-center justify-between px-4 md:px-8 shadow-lg"
    >
      {/* Track Info */}
      <div className="flex flex-col max-md:flex-row max-md:items-center max-md:text-sm max-md:gap-2 justify-center md:flex-1 max-md:pt-2 min-w-0">
        <span className="font-semibold text-lg truncate">{trackName}</span>
        {artist && <span className="text-sm text-gray-400 truncate">{artist}</span>}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-2 md:mt-0 max-md:flex-1">
        <button className="p-2 hover:bg-neutral-700 rounded-full transition-colors">
          <IconArrowsShuffle className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-neutral-700 rounded-full transition-colors">
          <IconPlayerSkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={togglePlay}
          className="p-3 bg-neutral-700 hover:bg-neutral-600 rounded-full transition-colors"
        >
          {isPlaying ? (
            <IconPlayerPause className="w-6 h-6" />
          ) : (
            <IconPlayerPlay className="w-6 h-6" />
          )}
        </button>
        <button className="p-2 hover:bg-neutral-700 rounded-full transition-colors">
          <IconPlayerSkipForward className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-neutral-700 rounded-full transition-colors">
          <IconRepeat className="w-5 h-5" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 mt-2 md:mt-0 w-32 md:w-40 max-md:hidden" >
        <IconVolume className="w-5 h-5" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-1 rounded-lg accent-indigo-500"
        />
      </div>

      {/* Close Button */}
      <div className="ml-2 max-md:hidden" >
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-neutral-700 transition-colors"
        >
          <IconX className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
