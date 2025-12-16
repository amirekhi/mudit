"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAudioStore, Track as TrackType } from "@/store/useAudioStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadSongs } from "@/lib/firebase/uploadSongs";
import { uploadImage } from "@/lib/firebase/uploadImage";
import Image from "next/image";

export default function CreateSongPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [playlists, setPlaylists] = useState<{ _id: string; title: string }[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);

  const playTrack = useAudioStore((s) => s.playTrack);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const stop = useAudioStore((s) => s.stop);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  const queryClient = useQueryClient();

  // Fetch playlists from backend
  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => setPlaylists(data))
      .catch((err) => console.error("Failed to fetch playlists:", err));
  }, []);

  // TanStack mutation to create track
  const createTrackMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No audio file selected");

      const songUrl = await uploadSongs(file);
      const imageUrl = imageFile ? await uploadImage(imageFile) : undefined;

      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, url: songUrl, image: imageUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create track");
      }

      return res.json();
    },
    onSuccess: async (createdTrack) => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });

      // Add track to selected playlists
      if (selectedPlaylists.length) {
        await fetch("/api/playlists/addTrack", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackId: createdTrack._id,
            playlistIds: selectedPlaylists,
          }),
        });
      }

      // Reset form
      setFile(null);
      setImageFile(null);
      setImagePreview(null);
      setTitle("");
      setArtist("");
      setSelectedPlaylists([]);
    },
  });

  // Local audio preview
  useEffect(() => {
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const track: TrackType = {
      _id: "local-preview",
      title: file.name,
      artist: "Local file",
      url: objectUrl,
    };

    playTrack(track);

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

  // Image preview effect
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setImageFile(selected);
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-6 flex items-center">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Audio */}
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
            <input type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
            {!file ? (
              <p className="text-neutral-400">Drag & drop your audio file here, or click to browse</p>
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

        {/* Right Side */}
        <div className="space-y-6">
          {/* Playlists */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Add to Playlists</h2>
            <ul className="space-y-2">
              {playlists.map((playlist) => {
                const checked = selectedPlaylists.includes(playlist._id);
                return (
                  <li
                    key={playlist._id}
                    className="flex items-center justify-between cursor-pointer rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                    onClick={() => {
                      setSelectedPlaylists((prev) =>
                        checked
                          ? prev.filter((id) => id !== playlist._id)
                          : [...prev, playlist._id]
                      );
                    }}
                  >
                    <span>{playlist.title}</span>
                    <span
                      className={`h-4 w-4 flex items-center justify-center rounded-full border ${
                        checked ? "border-white" : "border-neutral-500"
                      }`}
                    >
                      {checked && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          {/* Song Details & Image */}
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
              />
              <input
                placeholder="Artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
              />

              {/* Styled Image Upload */}
              <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 text-center text-neutral-400 hover:border-white hover:text-white transition">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                {!imagePreview ? (
                  <span>Drag & drop cover image, or click to select</span>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <span>Preview</span>
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={120}
                      height={120}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
              </label>
            </div>
          </motion.div>

          {/* Create Track Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
          >
            <button
              disabled={!file || !title || !artist || createTrackMutation.isPending}
              onClick={() => createTrackMutation.mutate()}
              className={`w-full rounded-xl font-medium py-3 transition ${
                !file || !title || !artist
                  ? "bg-neutral-700 text-neutral-400 pointer-events-none"
                  : "bg-white text-neutral-900 hover:bg-neutral-200"
              }`}
            >
              {createTrackMutation.isPending ? "Uploading..." : "Create Track"}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
