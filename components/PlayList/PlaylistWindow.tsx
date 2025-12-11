"use client";
import { useEffect, useState } from "react";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { useAudioStore } from "@/store/useAudioStore";
import { IconX, IconPlayerPlay } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import PlaylistTrack from "./PlaylistTrack";

export default function PlaylistWindow() {
  const playlist = usePlaylistStore((s) => s.playlist);
  const currentPlaylist = usePlaylistStore((s) => s.currentPlaylist);
  const removeTrack = usePlaylistStore((s) => s.removeTrack);

 const playTrack = useAudioStore((state) => state.playTrack);


  const [isOpen, setIsOpen] = useState(false);
  console.log("playlist window")
  // Automatically open when a playlist is set
  useEffect(() => {
    if (currentPlaylist) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [currentPlaylist]);

  const handlePlayAll = () => {
    if (playlist.length > 0) playTrack(playlist[0]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "tween", duration: 0.4 }}
          className="shrink-0 flex flex-col border-l border-neutral-700 bg-neutral-900 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-700">
            <h2 className="text-xl font-semibold text-white">Playlist</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayAll}
                className="p-1 rounded hover:bg-neutral-700 transition-colors flex items-center gap-1"
              >
                <IconPlayerPlay className="w-4 h-4 text-white" />
                <span className="text-sm text-white">Play All</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-neutral-700 transition-colors"
              >
                <IconX className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Playlist Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scroll">
            {playlist.length === 0 && (
              <div className="text-sm text-neutral-400">No tracks in playlist</div>
            )}

            {playlist.map((track, index) => (
              <PlaylistTrack
                key={track.id}
                track={track}
                index={index}
                removeTrack={removeTrack}
                idx={index}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
