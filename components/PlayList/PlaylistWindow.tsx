"use client";

import { useEffect, useState } from "react";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { useAudioStore } from "@/store/useAudioStore";
import { IconX, IconPlayerPlay } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import PlaylistTrack from "./PlaylistTrack";

export default function PlaylistWindow() {
  const playlist        = usePlaylistStore(s => s.playlist);
  const currentPlaylist = usePlaylistStore(s => s.currentPlaylist);
  const isOpen          = usePlaylistStore(s => s.isOpen);
  const openWindow      = usePlaylistStore(s => s.openWindow);
  const closeWindow     = usePlaylistStore(s => s.closeWindow);
  const removeTrack     = usePlaylistStore(s => s.removeTrack);
  const playTrack       = useAudioStore(s => s.playTrack);

  // On mobile this becomes a fixed overlay instead of a flex sibling, so
  // opening it can never shove the rest of the layout to the left.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 767px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-open whenever a new playlist is loaded
  useEffect(() => {
    if (currentPlaylist) openWindow();
  }, [currentPlaylist, openWindow]);

  const handlePlayAll = () => {
    if (playlist.length > 0) playTrack(playlist[0]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — mobile only. Desktop has room for the panel to just push in. */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeWindow}
              className="fixed inset-0 bg-black/50 z-40"
            />
          )}

          <motion.div
            initial={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
            animate={isMobile ? { x: 0 } : { width: 300, opacity: 1 }}
            exit={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className={`flex flex-col border-l border-neutral-200 dark:border-neutral-700
              bg-white dark:bg-neutral-900 overflow-hidden transition-colors
              ${isMobile
                ? "fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm shadow-2xl"
                : "shrink-0"
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Playlist</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <IconPlayerPlay className="w-4 h-4 text-neutral-900 dark:text-white" />
                  <span className="text-sm text-neutral-900 dark:text-white">Play All</span>
                </button>
                <button
                  onClick={closeWindow}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <IconX className="w-5 h-5 text-neutral-900 dark:text-white" />
                </button>
              </div>
            </div>

            {/* Track list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scroll">
              {playlist.length === 0 ? (
                <p className="text-sm text-neutral-500">No tracks in playlist</p>
              ) : (
                playlist.map((track, index) => (
                  <PlaylistTrack
                    key={track._id}
                    track={track}
                    index={index}
                    removeTrack={removeTrack}
                    idx={index}
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}