"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAudioStore, Track } from "@/store/useAudioStore";

const playlists = [
  { id: 1, name: "Chill Vibes" },
  { id: 2, name: "Workout Mix" },
  { id: 3, name: "Late Night Coding" },
];

export default function CreateSongPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedPlaylists, setSelectedPlaylists] = useState<number[]>([]);

  const playTrack = useAudioStore((s) => s.playTrack);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const stop = useAudioStore((s) => s.stop);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  useEffect(() => {
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const track: Track = {
      id: "local-preview",
      title: file.name,
      artist: "Local file",
      url: objectUrl,
    };

    playTrack(track);

    // Immediately pause to show player UI without autoplay
    const { howl } = useAudioStore.getState();
    if (howl && useAudioStore.getState().isPlaying) {
      howl.pause();
      useAudioStore.setState({ isPlaying: false });
    }

    return () => {
      stop();
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, playTrack, stop]);

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-6 flex items-center">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Upload Island */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-8"
        >
          <h1 className="text-2xl font-semibold text-white mb-6">Import Song</h1>

          <label
            style={{ minHeight: "260px" }}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`cursor-pointer w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
              isDragging ? "border-white bg-neutral-800" : "border-neutral-700"
            }`}
          >
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {!file ? (
              <p className="text-neutral-400">
                Drag & drop your audio file here, or click to browse
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-white font-medium">File loaded</p>
                <p className="text-sm text-neutral-400">{file.name}</p>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200 transition"
                >
                  {isPlaying ? "Pause Preview" : "Play Preview"}
                </button>
              </div>
            )}
          </label>
        </motion.div>

        {/* Right Side Islands */}
        <div className="space-y-6">

          {/* Playlists (multi-select) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Add to Playlists</h2>
            <ul className="space-y-2">
              {playlists.map((playlist) => {
                const checked = selectedPlaylists.includes(playlist.id);
                return (
                  <li
                    key={playlist.id}
                    className="flex items-center justify-between cursor-pointer rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                    onClick={() => {
                      setSelectedPlaylists((prev) =>
                        checked ? prev.filter((id) => id !== playlist.id) : [...prev, playlist.id]
                      );
                    }}
                  >
                    <span>{playlist.name}</span>
                    <span className={`h-4 w-4 flex items-center justify-center rounded-full border ${checked ? 'border-white' : 'border-neutral-500'}`}>
                      {checked && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          {/* Song Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Song Details</h2>
            <div className="space-y-3 text-sm">
              <input
                placeholder="Song title"
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
              />
              <input
                placeholder="Artist"
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
              />
            </div>
          </motion.div>

          {/* Continue Island */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
          >
            <Link
              href="/songs/edit"
              className={`block text-center rounded-xl font-medium py-3 transition ${
                file ? "bg-white text-neutral-900 hover:bg-neutral-200" : "bg-neutral-700 text-neutral-400 pointer-events-none"
              }`}
            >
              Open Editing Panel
            </Link>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
