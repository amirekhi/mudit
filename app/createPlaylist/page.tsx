"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const dummySongs = [
  { id: 1, title: "Song A", artist: "Artist 1" },
  { id: 2, title: "Song B", artist: "Artist 2" },
  { id: 3, title: "Song C", artist: "Artist 3" },
  { id: 4, title: "Song D", artist: "Artist 4" },
  { id: 5, title: "Song E", artist: "Artist 5" },
];

export default function CreatePlaylistPage() {
  const [playlistName, setPlaylistName] = useState("");
  const [playlistImage, setPlaylistImage] = useState<File | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSongs, setFilteredSongs] = useState(dummySongs);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!searchQuery) {
        setFilteredSongs(dummySongs);
      } else {
        setFilteredSongs(
          dummySongs.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) setPlaylistImage(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPlaylistImage(file);
  };

  const handleCreatePlaylist = () => {
    console.log("Creating playlist:", {
      name: playlistName,
      image: playlistImage,
      songs: selectedSongs,
    });
    alert(`Playlist '${playlistName}' created with ${selectedSongs.length} songs!`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-6 flex items-center">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Playlist Details + Image Island */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 space-y-6"
        >
          <h1 className="text-2xl font-semibold text-white">Create Playlist</h1>

          <input
            placeholder="Playlist Name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
          />

          <label
            style={{ minHeight: "180px" }}
            onDragEnter={(e) => e.preventDefault()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`cursor-pointer w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
              playlistImage ? "border-white bg-neutral-800" : "border-neutral-700"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            {!playlistImage ? (
              <p className="text-neutral-400">Drag & drop playlist image or click to browse</p>
            ) : (
              <img
                src={URL.createObjectURL(playlistImage)}
                alt="Playlist Preview"
                className="h-32 w-32 object-cover rounded-lg"
              />
            )}
          </label>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-neutral-900 font-medium py-2 px-4 rounded-lg hover:bg-neutral-200 transition"
          >
            Add Songs to Playlist
          </button>

          <button
            type="button"
            onClick={handleCreatePlaylist}
            disabled={!playlistName}
            className={`mt-4 w-full py-3 rounded-lg font-medium text-center transition ${
              playlistName ? "bg-green-500 hover:bg-green-600 text-white" : "bg-neutral-700 text-neutral-400 pointer-events-none"
            }`}
          >
            Create Playlist
          </button>

        </motion.div>

        {/* Right Side Island - Selected Songs + Options Island */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Selected Songs</h2>
            <ul className="space-y-2">
              {selectedSongs.map((id) => {
                const song = dummySongs.find((s) => s.id === id);
                if (!song) return null;
                return (
                  <li key={id} className="text-sm text-white">
                    {song.title} - {song.artist}
                  </li>
                );
              })}
              {selectedSongs.length === 0 && <p className="text-neutral-400">No songs selected</p>}
            </ul>
          </div>

          {/* Options Island */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Options</h2>
            <Link
              href="/songs/create"
              className="block text-white py-2 px-3 rounded-lg hover:bg-neutral-800 transition"
            >
              Create New Song
            </Link>
            <Link
              href="/songs/edit"
              className="block text-white py-2 px-3 rounded-lg hover:bg-neutral-800 transition"
            >
              Open Song Editor
            </Link>
          </motion.div>
        </motion.div>

        {/* Modal for searching and adding songs */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-neutral-900 rounded-2xl p-6 w-full max-w-lg space-y-4"
            >
              <h3 className="text-white font-semibold text-lg">Add Songs</h3>
              <input
                type="text"
                placeholder="Search songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
              />

              <ul className="max-h-64 overflow-y-auto space-y-2">
                {filteredSongs.map((song) => {
                  const checked = selectedSongs.includes(song.id);
                  return (
                    <li
                      key={song.id}
                      className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-800 cursor-pointer"
                      onClick={() => {
                        setSelectedSongs((prev) =>
                          checked ? prev.filter((id) => id !== song.id) : [...prev, song.id]
                        );
                      }}
                    >
                      <span>{song.title} - {song.artist}</span>
                      {checked && <span className="h-3 w-3 bg-white rounded-full" />}
                    </li>
                  );
                })}
              </ul>

              <div className="flex justify-end space-x-2">
                <button
                  className="bg-neutral-700 text-white px-4 py-2 rounded-lg hover:bg-neutral-600 transition"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}