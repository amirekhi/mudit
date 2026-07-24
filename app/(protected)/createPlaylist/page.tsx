"use client";

import { useState, useEffect, ChangeEvent, DragEvent, useMemo } from "react";
import { motion, Reorder } from "framer-motion";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PlaylistDb } from "@/types/playlistTypes";
import { Track } from "@/store/useAudioStore";
import { createPlaylist } from "@/lib/TanStackQuery/CreatePlaylist/PlaylistsMutations";
import { storage } from "@/lib/storage/storage";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { Spinner } from "@/components/basics/Spinner";
import { useRouter } from "next/navigation";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";
import ShareButton from "@/components/PlayList/ShareButton";

export default function CreatePlaylistPage() {
  const [playlistName, setPlaylistName] = useState("");
  const [playlistImage, setPlaylistImage] = useState<File | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null);
  const [createdVisibility, setCreatedVisibility] = useState<"public" | "private">("private");

  const router = useRouter();

  const { data: currentUser, isLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const { data: songs = [] } = useQuery<Track[], Error>({
    queryKey: ["user-tracks"],
    queryFn: async () => {
      const res = await authFetch("/api/tracks/me");
      if (!res.ok) throw new Error("Failed to fetch user tracks");
      return res.json() as Promise<Track[]>;
    },
  });

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return songs;
    return songs.filter((s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [songs, searchQuery]);

  const mutation = useMutation<PlaylistDb, Error, PlaylistDb>({
    mutationFn: createPlaylist,
    onSuccess: (data) => {
      setCreatedPlaylistId((data as any)._id);
      setCreatedVisibility(data.visibility ?? "private");
      setPlaylistName("");
      setPlaylistImage(null);
      setSelectedSongs([]);
      setVisibility("private");
    },
    onError: (err: any) => {
      if (err.status === 401) {
        router.push("/login");
        return;
      }
      alert(err.message || "Failed to create playlist");
    },
  });

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) setPlaylistImage(file);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPlaylistImage(file);
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) return;

    let imageUrl = "";

    if (playlistImage) {
      try {
        imageUrl = await storage.uploadImage(playlistImage);
      } catch {
        alert("Failed to upload image");
        return;
      }
    } else if (selectedSongs.length > 0) {
      const firstTrack = songs.find((s) => s._id === selectedSongs[0]);
      if (firstTrack?.image) imageUrl = firstTrack.image;
    }

    const payload: PlaylistDb = {
      title: playlistName,
      description: "",
      image: imageUrl,
      trackIds: selectedSongs,
      visibility,
    };

    mutation.mutate(payload);
  };

  const firstSelectedTrack = songs.find((s) => s._id === selectedSongs[0]);
  const canCreate = !!playlistName.trim() && !mutation.isPending;

  return (
    <div className="min-h-screen flex justify-center items-center bg-neutral-50 dark:bg-neutral-950 px-4 sm:px-6 pb-24 max-md:pb-12 transition-colors">
      <div className="max-w-6xl mx-auto w-full py-12">

        {/* Header */}
        <div className="w-full flex items-center justify-between mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Create Playlist</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Build your perfect collection</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-6 transition-colors"
          >
            <input
              placeholder="Playlist Name"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
            />

            {/* VISIBILITY */}
            {!isLoading && isAdmin && (
              <div className="flex items-center gap-4">
                <span className="text-neutral-900 dark:text-white text-sm">Visibility</span>
                <div
                  onClick={() =>
                    setVisibility(visibility === "private" ? "public" : "private")
                  }
                  className="relative w-36 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-full cursor-pointer border border-neutral-300 dark:border-neutral-700"
                >
                  <motion.div
                    animate={{ x: visibility === "public" ? "100%" : "0%" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 left-1 h-7 w-[calc(50%-4px)] bg-white rounded-full shadow"
                  />
                  <div className="relative z-10 flex h-full text-xs font-medium select-none">
                    <div className="w-1/2 flex items-center justify-center text-black">Private</div>
                    <div className="w-1/2 flex items-center justify-center text-black">Public</div>
                  </div>
                </div>
              </div>
            )}

            {/* IMAGE */}
            <label
              style={{ minHeight: "180px" }}
              onDragEnter={(e) => e.preventDefault()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`cursor-pointer w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 transition ${
                playlistImage || firstSelectedTrack?.image
                  ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
              }`}
            >
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              {playlistImage ? (
                <img
                  src={URL.createObjectURL(playlistImage)}
                  alt="Preview"
                  className="h-32 w-32 object-cover rounded-lg"
                />
              ) : firstSelectedTrack?.image ? (
                <img
                  src={firstSelectedTrack.image}
                  alt="Default playlist preview"
                  className="h-32 w-32 object-cover rounded-lg opacity-80"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-2xl">🖼</span>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Drag & drop a cover image, or click to browse</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">Optional — will use first track's art if available</p>
                </div>
              )}
            </label>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium py-2 px-4 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition text-sm"
            >
              {selectedSongs.length > 0
                ? `${selectedSongs.length} song${selectedSongs.length > 1 ? "s" : ""} added — edit`
                : "Add Songs (optional)"}
            </button>

            <button
              onClick={handleCreatePlaylist}
              disabled={!canCreate}
              className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                mutation.isPending
                  ? "bg-green-500 text-white cursor-not-allowed"
                  : canCreate
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 pointer-events-none"
              }`}
            >
              {mutation.isPending ? (
                <>
                  <Spinner size={18} />
                  Creating...
                </>
              ) : (
                "Create Playlist"
              )}
            </button>

            {!playlistName.trim() && (
              <p className="text-xs text-neutral-500 text-center -mt-2">
                A playlist name is all you need to get started
              </p>
            )}

            {/* Share button — appears after creation */}
            {createdPlaylistId && (
              <div className="pt-2 space-y-2">
                <p className="text-green-600 dark:text-green-400 text-sm">Playlist created successfully!</p>
                <ShareButton
                  playlistId={createdPlaylistId}
                  playlistVisibility={createdVisibility}
                />
              </div>
            )}
          </motion.div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-colors">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">
                Selected Songs
                {selectedSongs.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                    {selectedSongs.length} track{selectedSongs.length > 1 ? "s" : ""}
                  </span>
                )}
              </h2>
              {selectedSongs.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-neutral-500">No songs added yet</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">You can add songs later from the playlist editor</p>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={selectedSongs}
                  onReorder={setSelectedSongs}
                  className="space-y-2 max-h-64 overflow-y-auto"
                >
                  {selectedSongs.map((id) => {
                    const song = songs.find((s) => s._id === id);
                    if (!song) return null;
                    return (
                      <Reorder.Item
                        key={id}
                        value={id}
                        className="flex justify-between px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300"
                      >
                        <span className="truncate">{song.title} — {song.artist}</span>
                        <button
                          onClick={() =>
                            setSelectedSongs((prev) => prev.filter((sid) => sid !== id))
                          }
                          className="ml-2 shrink-0 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                        >
                          ✕
                        </button>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-3 transition-colors">
              <Link href="/songs/create" className="block text-sm text-neutral-900 dark:text-white py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                + Create New Song
              </Link>
              <Link href="/songs/edit" className="block text-sm text-neutral-900 dark:text-white py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                Open Song Editor
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-2xl p-6 w-full max-w-lg space-y-4 mb-0 sm:mb-0"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-neutral-900 dark:text-white font-semibold text-lg">Add Songs</h3>
              {selectedSongs.length > 0 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{selectedSongs.length} selected</span>
              )}
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs..."
              className="w-full rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
            />
            <ul className="max-h-64 overflow-y-auto space-y-1">
              {filteredSongs.length === 0 ? (
                <li className="text-sm text-neutral-500 px-3 py-4 text-center">No tracks found</li>
              ) : (
                filteredSongs.map((song) => {
                  const checked = selectedSongs.includes(song._id);
                  return (
                    <li
                      key={song._id}
                      onClick={() =>
                        setSelectedSongs((prev) =>
                          checked
                            ? prev.filter((id) => id !== song._id)
                            : [...prev, song._id]
                        )
                      }
                      className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer text-sm transition ${
                        checked
                          ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span className="truncate">{song.title} — {song.artist}</span>
                      {checked && <span className="ml-2 shrink-0 h-3 w-3 bg-neutral-900 dark:bg-white rounded-full" />}
                    </li>
                  );
                })
              )}
            </ul>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white px-4 py-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition text-sm"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}