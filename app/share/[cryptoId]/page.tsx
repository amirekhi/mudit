"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { IconClock, IconMusic, IconAlertCircle } from "@tabler/icons-react";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { useAudioStore } from "@/store/useAudioStore";
import { Track } from "@/store/useAudioStore";
import ThemeToggle from "@/components/basics/ThemeToggle";

interface SharedPlaylist {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  tracks: Track[];
}

export default function SharedPlaylistPage() {
  const { cryptoId } = useParams<{ cryptoId: string }>();
  const [playlist, setPlaylist] = useState<SharedPlaylist | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setPlaylistStore = usePlaylistStore((s) => s.setPlaylist);
  const playTrack = usePlaylistStore((s) => s.playTrack);
  const setCurrentPlaylist = usePlaylistStore((s) => s.setCurrentPlaylist);

  useEffect(() => {
    fetch(`/api/share/${cryptoId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to load");
        }
        return res.json();
      })
      .then((data) => {
        setPlaylist(data.playlist);
        setExpiresAt(data.expiresAt);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cryptoId]);

  const handlePlayAll = () => {
    if (!playlist) return;
    setPlaylistStore(playlist.tracks);
    setCurrentPlaylist(playlist._id);
    playTrack(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-colors">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-4 transition-colors">
        <IconAlertCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
        <p className="text-neutral-900 dark:text-white text-lg font-medium">{error}</p>
        <p className="text-neutral-500 dark:text-neutral-500 text-sm">This link may have expired or is invalid.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 px-4 py-10 transition-colors">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden transition-colors"
        >
          {/* Cover */}
          {playlist?.image && (
            <img
              src={playlist.image}
              alt={playlist.title}
              className="w-full h-56 object-cover"
            />
          )}

          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{playlist?.title}</h1>
                {playlist?.description && (
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">{playlist.description}</p>
                )}
              </div>
              <button
                onClick={handlePlayAll}
                className="shrink-0 px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-medium rounded-xl transition"
              >
                Play All
              </button>
            </div>

            {expiresAt && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-500">
                <IconClock className="w-3.5 h-3.5" />
                <span>Link expires {new Date(expiresAt).toLocaleString()}</span>
              </div>
            )}

            {/* Track list */}
            <div className="space-y-1 pt-2">
              {playlist?.tracks.map((track, i) => (
                <div
                  key={track._id}
                  onClick={() => {
                    if (!playlist) return;
                    setPlaylistStore(playlist.tracks);
                    setCurrentPlaylist(playlist._id);
                    playTrack(i);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors group"
                >
                  <span className="text-neutral-400 dark:text-neutral-600 text-xs w-4 text-right">{i + 1}</span>
                  {track.image ? (
                    <img src={track.image} alt={track.title} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                      <IconMusic className="w-4 h-4 text-neutral-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-900 dark:text-white text-sm font-medium truncate">{track.title}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-xs truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}