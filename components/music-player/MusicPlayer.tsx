"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconX,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconVolume,
  IconVolumeOff,
  IconArrowsShuffle,
  IconPlaylist,
  IconExternalLink,          // 👈 add
} from "@tabler/icons-react";

import { useAudioStore } from "@/store/useAudioStore";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import Link from "next/link";

export default function EnhancedMusicPlayer({ onClose }: { onClose?: () => void }) {
  const {
    currentTrack, isPlaying, volume,
    togglePlay, setVolume, howl, unload,
  } = useAudioStore();

  const { currentPlaylist, nextTrack, prevTrack } = usePlaylistStore();

  // 👇 new
  const toggleWindow  = usePlaylistStore(s => s.toggleWindow);
  const isOpen        = usePlaylistStore(s => s.isOpen);
  const playlistCount = usePlaylistStore(s => s.playlist.length);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastVolumeRef = useRef(0.5);
  const isMuted = volume === 0;
  const [expanded, setExpanded] = useState(false);
  const miniRef = useRef<HTMLDivElement>(null);

  const handlePrevTrack = () => prevTrack();
  const handleNextTrack = () => nextTrack();

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (howl) setDuration(howl.duration());
    if (howl && isPlaying) {
      interval = setInterval(() => {
        const current = howl.seek() as number;
        const total = howl.duration();
        setCurrentTime(current);
        setDuration(total);
        setProgress(total ? current / total : 0);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [howl, isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!howl) return;
    const value = Number(e.target.value);
    const newTime = value * duration;
    howl.seek(newTime);
    setProgress(value);
    setCurrentTime(newTime);
  };

  const handleToggleMute = () => {
    if (volume === 0) setVolume(lastVolumeRef.current || 0.5);
    else { lastVolumeRef.current = volume; setVolume(0); }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    if (value > 0) lastVolumeRef.current = value;
  };

  const handleClose = () => { unload(); onClose?.(); };

  // Reusable playlist toggle button
  const PlaylistToggle = ({ className = "" }: { className?: string }) => (
    <button
      onClick={toggleWindow}
      title="Toggle playlist"
      className={`relative p-2 rounded-full transition-colors ${
        isOpen
          ? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/25"
          : "hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
      } ${className}`}
    >
      <IconPlaylist className="w-5 h-5" />
      {/* Badge — count when window is closed */}
      {playlistCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500
          text-[9px] text-white flex items-center justify-center font-bold leading-none">
          {playlistCount > 9 ? "9+" : playlistCount}
        </span>
      )}
    </button>
  );

  if (!currentTrack) return null;

  return (
    <>
      {/* ── Desktop Player ── */}
      <motion.div
        initial={{ height: "0px", opacity: 0 }}
        animate={{ height: currentTrack ? "80px" : 0, opacity: currentTrack ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="hidden md:flex overflow-hidden bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white w-full flex-row
          items-center justify-between px-4 md:px-8 shadow-lg rounded-full m-1 border border-neutral-200 dark:border-transparent transition-colors"
      >
        {/* Track Info */}
    
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-lg truncate">{currentTrack.title}</span>
            {currentTrack.artist && (
              <span className="text-sm text-neutral-500 dark:text-gray-400 truncate">{currentTrack.artist}</span>
            )}
          </div>
          {currentTrack.image && (
            <div className="w-16 h-16 shrink-0">
              <img src={currentTrack.image} alt={currentTrack.title}
                className="w-full h-full object-cover rounded-md" />
            </div>
          )}
          <Link
            href={`/tracks/${currentTrack._id}`}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg
              bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-xs text-neutral-600 dark:text-neutral-300
              hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <IconExternalLink className="w-3.5 h-3.5" />
            View
          </Link>
        </div>
        {/* Progress */}
        <div className="flex flex-col w-full md:w-64 mx-4">
          <input type="range" min={0} max={1} step={0.001}
            value={isNaN(progress) ? 0 : progress}
            onChange={handleSeek}
            className="w-full h-1 accent-indigo-500" />
          <div className="flex justify-between text-xs text-neutral-500 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full">
            <IconArrowsShuffle className="w-5 h-5" />
          </button>
          <button onClick={handlePrevTrack} disabled={!currentPlaylist}
            className={`p-2 rounded-full ${currentPlaylist ? "hover:bg-neutral-200 dark:hover:bg-neutral-700" : "opacity-40 cursor-not-allowed"}`}>
            <IconPlayerSkipBack className="w-5 h-5" />
          </button>
          <button onClick={togglePlay}
            className="p-3 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full">
            {isPlaying ? <IconPlayerPause className="w-6 h-6" /> : <IconPlayerPlay className="w-6 h-6" />}
          </button>
          <button onClick={handleNextTrack} disabled={!currentPlaylist}
            className={`p-2 rounded-full ${currentPlaylist ? "hover:bg-neutral-200 dark:hover:bg-neutral-700" : "opacity-40 cursor-not-allowed"}`}>
            <IconPlayerSkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 w-40">
          <button onClick={handleToggleMute} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full">
            {isMuted
              ? <IconVolumeOff className="w-5 h-5 text-neutral-400 dark:text-gray-400" />
              : <IconVolume className="w-5 h-5" />}
          </button>
          <input type="range" min={0} max={1} step={0.01}
            value={volume} onChange={handleVolumeChange}
            className="w-full h-1 accent-indigo-500" />
        </div>

        {/* 👇 Playlist toggle — desktop */}
        <PlaylistToggle className="ml-2" />

        {/* Close */}
        <div className="hidden md:block ml-1">
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
            <IconX className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* ── Mobile Player ── */}
      <AnimatePresence>
        {!expanded && (
          <motion.div
            ref={miniRef}
            className="md:hidden fixed bottom-4 left-4 w-60 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-xl
              shadow-xl flex items-center p-2 cursor-grab z-50"
            drag
            dragConstraints={{
              top: 0,
              bottom: window.innerHeight - 80,
              left: 0,
              right: window.innerWidth - 240,
            }}
            dragElastic={0.2}
            whileTap={{ cursor: "grabbing" }}
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {currentTrack.image && (
              <img src={currentTrack.image} alt={currentTrack.title}
                className="w-14 h-14 rounded-lg object-cover" />
            )}
            <div className="ml-2 flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-neutral-900 dark:text-white">{currentTrack.title}</p>
              {currentTrack.artist && (
                <p className="text-xs text-neutral-500 dark:text-gray-400 truncate">{currentTrack.artist}</p>
              )}
            </div>
            <button onClick={e => { e.stopPropagation(); togglePlay(); }}
              className="ml-2 p-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full">
              {isPlaying ? <IconPlayerPause className="w-5 h-5 text-neutral-900 dark:text-white" /> : <IconPlayerPlay className="w-5 h-5 text-neutral-900 dark:text-white" />}
            </button>
            <button onClick={e => { e.stopPropagation(); handleClose(); }}
              className="ml-1 p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full">
              <IconX className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            </button>
          </motion.div>
        )}

        {/* Expanded Mobile Card */}
{expanded && (
          <motion.div
            className="md:hidden fixed bottom-4 left-2 right-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-xl
              shadow-2xl p-4 z-50 flex flex-col gap-3"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <div className="flex justify-between items-center">
              {/* Track info — constrained width */}
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                {currentTrack.image && (
                  <img src={currentTrack.image} alt={currentTrack.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex flex-col overflow-hidden min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <motion.div className="overflow-hidden whitespace-nowrap flex-1 min-w-0">
                      <motion.p
                        className="text-sm font-semibold whitespace-nowrap text-neutral-900 dark:text-white"
                        animate={{ x: ["0%", "-100%"] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                      >
                        {currentTrack.title}&nbsp;&nbsp;&nbsp;&nbsp;{currentTrack.title}
                      </motion.p>
                    </motion.div>
                    <Link
                      href={`/tracks/${currentTrack._id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex-shrink-0 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700
                        text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <IconExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  {currentTrack.artist && (
                    <p className="text-xs text-neutral-500 dark:text-gray-400 truncate">{currentTrack.artist}</p>
                  )}
                </div>
              </div>
              {/* Buttons — never pushed out */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <PlaylistToggle />
                <button onClick={() => setExpanded(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full">
                  <IconX className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
                </button>
              </div>
            </div>

            {/* Progress */}
            <input type="range" min={0} max={1} step={0.001}
              value={isNaN(progress) ? 0 : progress}
              onChange={handleSeek}
              className="w-full h-1 accent-indigo-500" />
            <div className="flex justify-between text-xs text-neutral-500 dark:text-gray-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full">
                  <IconArrowsShuffle className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
                </button>
                <button onClick={handlePrevTrack} disabled={!currentPlaylist}
                  className={`p-2 rounded-full text-neutral-700 dark:text-neutral-200 ${currentPlaylist ? "hover:bg-neutral-100 dark:hover:bg-neutral-700" : "opacity-40 cursor-not-allowed"}`}>
                  <IconPlayerSkipBack className="w-5 h-5" />
                </button>
                <button onClick={togglePlay}
                  className="p-3 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full">
                  {isPlaying ? <IconPlayerPause className="w-6 h-6 text-neutral-900 dark:text-white" /> : <IconPlayerPlay className="w-6 h-6 text-neutral-900 dark:text-white" />}
                </button>
                <button onClick={handleNextTrack} disabled={!currentPlaylist}
                  className={`p-2 rounded-full text-neutral-700 dark:text-neutral-200 ${currentPlaylist ? "hover:bg-neutral-100 dark:hover:bg-neutral-700" : "opacity-40 cursor-not-allowed"}`}>
                  <IconPlayerSkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 w-32">
                <button onClick={handleToggleMute} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full">
                  {isMuted
                    ? <IconVolumeOff className="w-5 h-5 text-neutral-400 dark:text-gray-400" />
                    : <IconVolume className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />}
                </button>
                <input type="range" min={0} max={1} step={0.01}
                  value={volume} onChange={handleVolumeChange}
                  className="w-full h-1 accent-indigo-500" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}