"use client";

import { useState, useEffect, ChangeEvent, DragEvent, useMemo } from "react";
import { motion, Reorder } from "framer-motion";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PlaylistDb } from "@/types/playlistTypes";
import { Track } from "@/store/useAudioStore";
import { createPlaylist } from "@/lib/TanStackQuery/CreatePlaylist/PlaylistsMutations";
import { uploadImage } from "@/lib/firebase/uploadImage";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { Spinner } from "@/components/basics/Spinner";
import { useRouter } from "next/navigation";

export default function CreatePlaylistPage() {
  const [playlistName, setPlaylistName] = useState("");
  const [playlistImage, setPlaylistImage] = useState<File | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

    const router = useRouter();

  const [visibility, setVisibility] =
    useState<"private" | "public">("private");

    const { data: currentUser, isLoading } = useCurrentUser();
    const isAdmin = currentUser?.role === "admin";

  // Fetch user's tracks
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
      alert(`Playlist '${data.title}' created!`);
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
    }
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
    if (!playlistName || selectedSongs.length === 0) return;

    let imageUrl = "";

    // 1. User uploaded image (highest priority)
    if (playlistImage) {
      try {
        imageUrl = await uploadImage(playlistImage);
      } catch {
        alert("Failed to upload image");
        return;
      }
    }
    // 2. Fallback to first track image
    else {
      const firstTrack = songs.find(
        (s) => s._id === selectedSongs[0]
      );

      if (firstTrack?.image) {
        imageUrl = firstTrack.image;
      }
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

  const firstSelectedTrack = songs.find(
    (s) => s._id === selectedSongs[0]
  );

  return (
    <div className="min-h-screen bg-neutral-950 px-6 flex items-center">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT */}
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

          {/* VISIBILITY */}
          {!isLoading && isAdmin && (
          <div className="flex items-center gap-4">
            <span className="text-white text-sm">Visibility</span>
            <div
              onClick={() =>
                setVisibility(visibility === "private" ? "public" : "private")
              }
              className="relative w-36 h-9 bg-neutral-800 rounded-full cursor-pointer border border-neutral-700"
            >
              <motion.div
                animate={{ x: visibility === "public" ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 left-1 h-7 w-[calc(50%-4px)] bg-white rounded-full"
              />

              <div className="relative z-10 flex h-full text-xs font-medium select-none">
                <div className="w-1/2 flex items-center justify-center text-black">
                  Private
                </div>
                <div className="w-1/2 flex items-center justify-center text-black">
                  Public
                </div>
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
                ? "border-white bg-neutral-800"
                : "border-neutral-700"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

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
              <p className="text-neutral-400">
                Drag & drop playlist image or click to browse
              </p>
            )}
          </label>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-neutral-900 font-medium py-2 px-4 rounded-lg hover:bg-neutral-200"
          >
            Add Songs to Playlist
          </button>
          <button
            onClick={handleCreatePlaylist}
            disabled={
              mutation.isPending || !playlistName || selectedSongs.length === 0
            }
            className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
              mutation.isPending
                ? "bg-green-500 text-white cursor-not-allowed"
                : playlistName && selectedSongs.length
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-neutral-700 text-neutral-400 pointer-events-none"
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

        </motion.div>

        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Selected Songs
            </h2>

            {selectedSongs.length === 0 ? (
              <p className="text-neutral-400">No songs selected</p>
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
                        className="flex justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-neutral-800 text-sm text-neutral-300"
                      >
                        <span>{song.title} - {song.artist}</span>
                        <button
                          onClick={() =>
                            setSelectedSongs((prev) => prev.filter((sid) => sid !== id))
                          }
                          className="text-white font-bold"
                        >
                          ✕
                        </button>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
            <Link
              href="/songs/create"
              className="block text-white py-2 px-3 rounded-lg hover:bg-neutral-800"
            >
              Create New Song
            </Link>
            <Link
              href="/songs/edit"
              className="block text-white py-2 px-3 rounded-lg hover:bg-neutral-800"
            >
              Open Song Editor
            </Link>
          </div>
        </motion.div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-neutral-900 rounded-2xl p-6 w-full max-w-lg space-y-4"
            >
              <h3 className="text-white font-semibold text-lg">Add Songs</h3>

              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs..."
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white"
              />

              <ul className="max-h-64 overflow-y-auto space-y-2">
                {filteredSongs.map((song) => {
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
                      className="flex justify-between px-3 py-2 rounded-lg hover:bg-neutral-800 cursor-pointer text-sm text-neutral-300"
                    >
                      <span>
                        {song.title} - {song.artist}
                      </span>
                      {checked && (
                        <span className="h-3 w-3 bg-white rounded-full" />
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-neutral-700 text-white px-4 py-2 rounded-lg hover:bg-neutral-600"
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
