"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAudioStore, Track as TrackType } from "@/store/useAudioStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { storage } from "@/lib/storage/storage";
import Image from "next/image";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { extractAudioMetadata } from "@/lib/Mp3DataParser/extractAudioMetadata";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { DraftTrack } from "@/models/Track";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";
import { Spinner } from "@/components/basics/Spinner";

interface PlaylistMeta {
  _id: string;
  title: string;
  visibility: "public" | "private";
}

export default function CreateSongPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [tracks, setTracks] = useState<DraftTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

  // Quick-playlist modal state
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [quickPlaylistName, setQuickPlaylistName] = useState("");
  const [quickPlaylistVisibility, setQuickPlaylistVisibility] = useState<"private" | "public">("private");
  const [quickPlaylistPending, setQuickPlaylistPending] = useState(false);
  const [quickPlaylistSuccess, setQuickPlaylistSuccess] = useState(false);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || null;

  const hasPublicPlaylist = playlists
    .filter((p) => selectedPlaylists.includes(p._id))
    .some((p) => p.visibility === "public");

  const effectiveVisibility = (track: DraftTrack) =>
    hasPublicPlaylist ? "public" : track.visibility;

  const globalVisibility = hasPublicPlaylist
    ? "public"
    : tracks.every((t) => t.visibility === "public")
    ? "public"
    : "private";

  const updateTrack = (id: string, patch: Partial<DraftTrack>) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const updateActiveTrack = (patch: Partial<DraftTrack>) => {
    if (!activeTrack) return;
    updateTrack(activeTrack.id, patch);
  };

  const playTrack = useAudioStore((s) => s.playTrack);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    authFetch("/api/playlists/me")
      .then((res) => res.json())
      .then(setPlaylists)
      .catch((err) => console.error("Failed to fetch playlists:", err));
  }, []);

  const handleFileChange = async (selected: File | null) => {
    if (!selected) return;
    const id = crypto.randomUUID();
    const draft: DraftTrack = {
      id,
      file: selected,
      title: "",
      artist: "",
      visibility: "private",
      selected: true,
    };

    try {
      const metadata = await extractAudioMetadata(selected);
      if (metadata?.title) draft.title = metadata.title;
      if (metadata?.artist) draft.artist = metadata.artist;
      if (metadata?.image) {
        draft.imageFile = new File([metadata.image], "embedded-image", {
          type: metadata.image.type,
        });
        draft.imagePreview = URL.createObjectURL(metadata.image);
      }
    } catch (err) {
      console.warn("Metadata extraction failed:", err);
    }

    setTracks((prev) => {
      if (prev.length === 0) setActiveTrackId(id);
      return [...prev, draft];
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files ?? []).forEach((f) => handleFileChange(f));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected) {
      updateActiveTrack({
        imageFile: selected,
        imagePreview: URL.createObjectURL(selected),
      });
    }
  };

  const handleSelectTrack = (track: DraftTrack) => {
    setActiveTrackId(track.id);
    const audioTrack: TrackType = {
      _id: "local-preview",
      title: track.title || track.file.name,
      artist: track.artist || "Local file",
      url: URL.createObjectURL(track.file),
      visibility: track.visibility,
      createdAt: "",
      updatedAt: "",
    };
    playTrack(audioTrack);
  };

  const togglePlaylistSelection = (playlistId: string) => {
    setSelectedPlaylists((prev) =>
      prev.includes(playlistId)
        ? prev.filter((id) => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  // Upload all selected tracks, then create a playlist with them
  const handleQuickCreatePlaylist = async () => {
    if (!quickPlaylistName.trim()) return;
    const tracksToUpload = tracks.filter((t) => t.selected);
    if (!tracksToUpload.length) return;

    setQuickPlaylistPending(true);
    try {
      const createdTracks = await Promise.all(
        tracksToUpload.map(async (t) => {
          const songUrl = await storage.uploadSongs(t.file);
          const imageUrl = t.imageFile ? await storage.uploadImage(t.imageFile) : undefined;

          const res = await authFetch("/api/tracks/public", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: t.title,
              artist: t.artist,
              url: songUrl,
              image: imageUrl,
              visibility: quickPlaylistVisibility,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to upload track");
          }
          return res.json();
        })
      );

      const coverImage = createdTracks[0]?.image ?? "";
      const res = await authFetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickPlaylistName,
          description: "",
          image: coverImage,
          trackIds: createdTracks.map((t) => t._id),
          visibility: quickPlaylistVisibility,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create playlist");
      }

      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      setTracks([]);
      setActiveTrackId(null);
      setSelectedPlaylists([]);
      setQuickPlaylistSuccess(true);
      setTimeout(() => {
        setPlaylistModalOpen(false);
        setQuickPlaylistSuccess(false);
        setQuickPlaylistName("");
        setQuickPlaylistVisibility("private");
      }, 1800);
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setQuickPlaylistPending(false);
    }
  };

  const createTracksMutation = useMutation({
    mutationFn: async () => {
      const tracksToUpload = tracks.filter((t) => t.selected);
      if (!tracksToUpload.length) throw new Error("No tracks selected");

      const createdTracks = await Promise.all(
        tracksToUpload.map(async (t) => {
          const songUrl = await storage.uploadSongs(t.file);
          const imageUrl = t.imageFile ? await storage.uploadImage(t.imageFile) : undefined;

          const res = await authFetch("/api/tracks/public", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: t.title,
              artist: t.artist,
              url: songUrl,
              image: imageUrl,
              visibility: effectiveVisibility(t),
            }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to create track");
          }
          return res.json();
        })
      );

      if (selectedPlaylists.length) {
        await authFetch("/api/playlists/addTrack", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackIds: createdTracks.map((t) => t._id),
            playlistIds: selectedPlaylists,
          }),
        });
      }

      return createdTracks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setTracks([]);
      setSelectedPlaylists([]);
      setActiveTrackId(null);
    },
    onError: (error: any) => {
      alert(error.message || "Failed to create tracks");
    },
  });

  const multiTrackMode = tracks.length > 1;
  const selectedCount = tracks.filter((t) => t.selected).length;
  const allSelectedValid = tracks
    .filter((t) => t.selected)
    .every((t) => t.title.trim() && t.artist.trim());
  const canSubmit = selectedCount > 0 && allSelectedValid && !createTracksMutation.isPending;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 px-4 sm:px-6 flex flex-col items-center justify-start transition-colors">
      <div className="max-w-6xl mx-auto w-full my-8 sm:my-12">

        {/* Header */}
        <div className="w-full flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white">Import Songs</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Upload and configure your tracks</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        {/* Public playlist banner */}
        <AnimatePresence>
          {hasPublicPlaylist && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/50 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3"
            >
              <span className="mt-0.5 text-amber-600 dark:text-amber-400">⚠</span>
              <p className="text-sm text-amber-700 dark:text-amber-300 leading-snug">
                A selected playlist is <span className="font-semibold">public</span> — all tracks will be uploaded as public automatically.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Drop zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 transition-colors"
            >
              <label
                style={{ minHeight: "200px" }}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`cursor-pointer w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  isDragging
                    ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                    : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
                }`}
              >
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    Array.from(e.target.files ?? []).forEach((f) => handleFileChange(f))
                  }
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 text-xl">
                    ♪
                  </div>
                  {tracks.length === 0 ? (
                    <>
                      <p className="text-neutral-700 dark:text-neutral-300 font-medium">Drop audio files here</p>
                      <p className="text-sm text-neutral-500">or click to browse — multiple files supported</p>
                    </>
                  ) : (
                    <>
                      <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                        {tracks.length} track{tracks.length > 1 ? "s" : ""} added
                      </p>
                      <p className="text-sm text-neutral-500">Drop more to add, or click to browse</p>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); togglePlay(); }}
                        className="mt-1 rounded-lg bg-neutral-900 dark:bg-white px-4 py-1.5 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition"
                      >
                        {isPlaying ? "Pause Preview" : "Preview Active"}
                      </button>
                    </>
                  )}
                </div>
              </label>

              {/* Quick create playlist shortcut */}
              <AnimatePresence>
                {tracks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-neutral-900 dark:text-white font-medium">Create a playlist from these tracks</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Uploads all selected tracks and wraps them into a new playlist in one step
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={selectedCount === 0 || !allSelectedValid}
                        onClick={() => setPlaylistModalOpen(true)}
                        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition border ${
                          selectedCount > 0 && allSelectedValid
                            ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-900"
                            : "border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-600 pointer-events-none"
                        }`}
                      >
                        + New Playlist
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Track list */}
            <AnimatePresence>
              {tracks.length > 0 && (
                <motion.div
                  key="track-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col gap-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                      Tracks
                      <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                        {selectedCount} of {tracks.length} selected
                      </span>
                    </h2>
                    {tracks.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTracks((prev) =>
                            prev.map((t) => ({ ...t, selected: selectedCount !== tracks.length }))
                          )
                        }
                        className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                      >
                        {selectedCount === tracks.length ? "Deselect all" : "Select all"}
                      </button>
                    )}
                  </div>

                  <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {tracks.map((track) => {
                      const isActive = track.id === activeTrackId;
                      const needsInfo = !track.title.trim() || !track.artist.trim();
                      return (
                        <li
                          key={track.id}
                          onClick={() => handleSelectTrack(track)}
                          className={`cursor-pointer group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                            isActive
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={track.selected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => updateTrack(track.id, { selected: !track.selected })}
                            className="shrink-0 accent-neutral-900"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm leading-tight">
                              {track.title || track.file.name}
                            </p>
                            <p className={`text-xs truncate mt-0.5 ${isActive ? "opacity-70" : "text-neutral-500 dark:text-neutral-500"}`}>
                              {track.artist || "Artist needed"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {needsInfo && !isActive && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">!</span>
                            )}
                            {isActive && (
                              <span className="text-xs font-semibold opacity-70">Editing</span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTracks((prev) => prev.filter((t) => t.id !== track.id));
                                if (isActive) setActiveTrackId(null);
                              }}
                              className={`text-sm opacity-0 group-hover:opacity-100 transition hover:text-red-500 dark:hover:text-red-400 ${
                                isActive ? "opacity-70" : "text-neutral-400 dark:text-neutral-500"
                              }`}
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Batch editor */}
            <AnimatePresence>
              {multiTrackMode && (
                <motion.div
                  key="batch-editor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col gap-4 transition-colors"
                >
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Edit All Tracks</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Fill in details for each track, or click one above to edit it in the panel
                    </p>
                  </div>

                  {!isLoading && isAdmin && !hasPublicPlaylist && (
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Set visibility for all</p>
                      <div className="flex gap-2">
                        {(["private", "public"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              setTracks((prev) => prev.map((t) => ({ ...t, visibility: v })))
                            }
                            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition border ${
                              globalVisibility === v
                                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasPublicPlaylist && !isLoading && isAdmin && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-300/50 dark:border-amber-500/20 px-3 py-2.5">
                      <p className="text-xs text-amber-700 dark:text-amber-400">Visibility locked to Public — public playlist selected</p>
                    </div>
                  )}

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {tracks.map((track, i) => (
                      <div
                        key={track.id}
                        className={`rounded-xl border p-4 transition ${
                          track.id === activeTrackId
                            ? "border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-neutral-800"
                            : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-neutral-500 font-mono w-5">{i + 1}</span>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1">{track.file.name}</p>
                          <input
                            type="checkbox"
                            checked={track.selected}
                            onChange={() => updateTrack(track.id, { selected: !track.selected })}
                            className="accent-neutral-900 dark:accent-white shrink-0"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            placeholder="Song title"
                            value={track.title}
                            onChange={(e) => updateTrack(track.id, { title: e.target.value })}
                            className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                          />
                          <input
                            placeholder="Artist"
                            value={track.artist}
                            onChange={(e) => updateTrack(track.id, { artist: e.target.value })}
                            className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT ── */}
          <div className="flex flex-col gap-5">

            {/* Playlists */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col transition-colors"
            >
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">Add to Playlists</h2>
              {playlists.length === 0 ? (
                <p className="text-sm text-neutral-500">No playlists yet</p>
              ) : (
                <ul className="space-y-1.5 overflow-y-auto max-h-44 pr-1">
                  {playlists.map((playlist) => {
                    const checked = selectedPlaylists.includes(playlist._id);
                    return (
                      <li
                        key={playlist._id}
                        onClick={() => togglePlaylistSelection(playlist._id)}
                        className="flex items-center justify-between cursor-pointer rounded-lg px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{playlist.title}</span>
                          {playlist.visibility === "public" && (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-400/10 rounded px-1.5 py-0.5">
                              Public
                            </span>
                          )}
                        </div>
                        <span
                          className={`ml-2 shrink-0 h-4 w-4 flex items-center justify-center rounded-full border transition ${
                            checked ? "border-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-600"
                          }`}
                        >
                          {checked && <span className="h-2 w-2 rounded-full bg-neutral-900 dark:bg-white" />}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>

            {/* Active track details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col gap-4 transition-colors"
            >
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                  {multiTrackMode && activeTrack ? "Selected Track" : "Song Details"}
                </h2>
                {multiTrackMode && activeTrack && (
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">{activeTrack.file.name}</p>
                )}
              </div>

              {activeTrack ? (
                <>
                  <input
                    placeholder="Song title"
                    value={activeTrack.title}
                    onChange={(e) => updateActiveTrack({ title: e.target.value })}
                    className="w-full rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                  />
                  <input
                    placeholder="Artist"
                    value={activeTrack.artist}
                    onChange={(e) => updateActiveTrack({ artist: e.target.value })}
                    className="w-full rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                  />

                  {!isLoading && isAdmin && !multiTrackMode && (
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Visibility</p>
                      <div
                        className={`relative w-full h-10 flex items-center rounded-full bg-neutral-200 dark:bg-neutral-800 select-none ${
                          hasPublicPlaylist ? "opacity-50 pointer-events-none" : "cursor-pointer"
                        }`}
                        onClick={() => {
                          if (hasPublicPlaylist) return;
                          updateActiveTrack({
                            visibility: activeTrack.visibility === "public" ? "private" : "public",
                          });
                        }}
                      >
                        <div
                          className={`absolute top-0 left-0 h-full w-1/2 rounded-full bg-white dark:bg-neutral-900 shadow transition-transform duration-300 ${
                            effectiveVisibility(activeTrack) === "public"
                              ? "translate-x-full"
                              : "translate-x-0"
                          }`}
                        />
                        <div className="relative flex w-full text-sm font-medium z-10">
                          {(["private", "public"] as const).map((v) => (
                            <div
                              key={v}
                              className={`w-1/2 text-center py-2 capitalize transition-colors duration-300 ${
                                effectiveVisibility(activeTrack) === v
                                  ? "text-neutral-900 dark:text-white"
                                  : "text-neutral-500 dark:text-neutral-400"
                              }`}
                            >
                              {v}
                            </div>
                          ))}
                        </div>
                      </div>
                      {hasPublicPlaylist && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">Locked — public playlist selected</p>
                      )}
                    </div>
                  )}

                  <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-center text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-neutral-900 dark:hover:text-white transition">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    {!activeTrack.imagePreview ? (
                      <span className="text-sm">Upload cover image</span>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Image
                          src={activeTrack.imagePreview}
                          alt="Cover preview"
                          width={100}
                          height={100}
                          className="rounded-lg object-cover"
                        />
                        <span className="text-xs text-neutral-500">Click to change</span>
                      </div>
                    )}
                  </label>
                </>
              ) : (
                <p className="text-sm text-neutral-500">
                  {tracks.length === 0 ? "Add a track to fill in details" : "Click a track to edit it"}
                </p>
              )}
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 transition-colors"
            >
              {selectedCount > 0 && !allSelectedValid && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                  Some selected tracks are missing a title or artist.
                </p>
              )}
              <button
                disabled={!canSubmit}
                onClick={() => createTracksMutation.mutate()}
                className={`w-full rounded-xl font-medium py-3 text-sm transition ${
                  canSubmit
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 pointer-events-none"
                }`}
              >
                {createTracksMutation.isPending
                  ? "Uploading…"
                  : `Upload ${selectedCount > 0 ? selectedCount : ""} Track${selectedCount !== 1 ? "s" : ""}`}
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── QUICK PLAYLIST MODAL ── */}
      <AnimatePresence>
        {playlistModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-md flex flex-col gap-5 mb-4 sm:mb-0"
            >
              {quickPlaylistSuccess ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 text-2xl">✓</div>
                  <p className="text-neutral-900 dark:text-white font-semibold">Playlist created!</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Tracks uploaded and playlist saved.</p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-neutral-900 dark:text-white font-semibold text-lg">New Playlist</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Uploads {selectedCount} track{selectedCount > 1 ? "s" : ""} and creates a playlist from them
                    </p>
                  </div>

                  <input
                    placeholder="Playlist name"
                    value={quickPlaylistName}
                    onChange={(e) => setQuickPlaylistName(e.target.value)}
                    className="w-full rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                    autoFocus
                  />

                  {!isLoading && isAdmin && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Visibility</span>
                      <div
                        onClick={() =>
                          setQuickPlaylistVisibility(
                            quickPlaylistVisibility === "private" ? "public" : "private"
                          )
                        }
                        className="relative w-36 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-full cursor-pointer border border-neutral-300 dark:border-neutral-700"
                      >
                        <motion.div
                          animate={{ x: quickPlaylistVisibility === "public" ? "100%" : "0%" }}
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

                  {/* Track preview list */}
                  <div className="rounded-xl bg-neutral-100 dark:bg-neutral-800 px-4 py-3 space-y-1.5 max-h-40 overflow-y-auto">
                    {tracks.filter((t) => t.selected).map((t, i) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <span className="text-xs text-neutral-400 dark:text-neutral-600 w-4 text-right shrink-0">{i + 1}</span>
                        <span className="truncate">{t.title || t.file.name}</span>
                        {t.artist && <span className="text-neutral-500 shrink-0">— {t.artist}</span>}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPlaylistModalOpen(false);
                        setQuickPlaylistName("");
                      }}
                      className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!quickPlaylistName.trim() || quickPlaylistPending}
                      onClick={handleQuickCreatePlaylist}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${
                        quickPlaylistName.trim() && !quickPlaylistPending
                          ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200"
                          : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 pointer-events-none"
                      }`}
                    >
                      {quickPlaylistPending ? (
                        <>
                          <Spinner size={14} />
                          Uploading…
                        </>
                      ) : (
                        "Create Playlist"
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}