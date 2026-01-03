"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, Reorder } from "framer-motion";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { uploadImage } from "@/lib/firebase/uploadImage";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { Track } from "@/store/useAudioStore";
import { Spinner } from "@/components/basics/Spinner";
import { PlaylistDb } from "@/types/playlistTypes";
import BackButton from "@/components/basics/BackButton";

// Simple debounce hook
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}




export default function UpdatePlaylistPage() {
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  // --- Playlist selection ---
  const [playlists, setPlaylists] = useState<PlaylistDb[]>([]);
  const [searchPlaylist, setSearchPlaylist] = useState("");
  const debouncedSearchPlaylist = useDebounce(searchPlaylist, 300);
  const [activePlaylist, setActivePlaylist] = useState<PlaylistDb | null>(null);

  // --- Playlist editing ---
  const [playlistName, setPlaylistName] = useState("");
  const [playlistImage, setPlaylistImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [trackSearch, setTrackSearch] = useState("");
  const debouncedTrackSearch = useDebounce(trackSearch, 300);

  const [isDirty, setIsDirty] = useState(false);


  //delet mutation 
  const handleDeletePlaylist = useMutation({
  mutationFn: async () => {
    if (!activePlaylist) return;

    const res = await authFetch(`/api/playlists/${activePlaylist._id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete playlist");
  },
  onSuccess: () => {
    setPlaylists(prev =>
      prev.filter(p => p._id !== activePlaylist?._id)
    );
    setActivePlaylist(null);
    setIsDirty(false);

    queryClient.invalidateQueries({ queryKey: ["user-playlists"] });

    alert("Playlist deleted successfully");
  },
  onError: (err: any) => {
    alert(err.message || "Failed to delete playlist");
  },
});

  // Fetch playlists
  useEffect(() => {
    authFetch("/api/playlists/me")
      .then(res => res.json())
      .then(setPlaylists);
  }, []);

  // Fetch tracks
  useEffect(() => {
    authFetch("/api/tracks/me")
      .then(res => res.json())
      .then(setAllTracks);
  }, []);

  // When a playlist is selected
  useEffect(() => {
    if (!activePlaylist) return;
    setPlaylistName(activePlaylist.title);
    setVisibility(activePlaylist.visibility ?? "private");
    setImagePreview(activePlaylist.image ?? null);

    const tracks = activePlaylist.trackIds
      .map(id => allTracks.find(t => t._id === id))
      .filter(Boolean) as Track[];
    setSelectedTracks(tracks);
  }, [activePlaylist, allTracks]);

  // Filter playlists
  const filteredPlaylists = useMemo(() => {
    if (!debouncedSearchPlaylist) return playlists;
    return playlists.filter(p =>
      p.title.toLowerCase().includes(debouncedSearchPlaylist.toLowerCase())
    );
  }, [playlists, debouncedSearchPlaylist]);

  // Filter tracks for adding
  const filteredTracks = useMemo(() => {
    if (!debouncedTrackSearch) return [];
    return allTracks.filter(
      t =>
        !selectedTracks.find(st => st._id === t._id) &&
        `${t.title} ${t.artist}`.toLowerCase().includes(debouncedTrackSearch.toLowerCase())
    );
  }, [allTracks, selectedTracks, debouncedTrackSearch]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPlaylistImage(f);
    setImagePreview(URL.createObjectURL(f));
    setIsDirty(true);
  };

  const handleUpdatePlaylist = useMutation({
    mutationFn: async () => {
      if (!activePlaylist || !playlistName || selectedTracks.length === 0) return;

      let imageUrl = imagePreview ?? "";

      if (playlistImage) {
        try {
          imageUrl = await uploadImage(playlistImage);
        } catch {
          alert("Failed to upload image");
          return;
        }
      }

      const payload: PlaylistDb = {
        _id: activePlaylist._id,
        title: playlistName,
        description: "",
        image: imageUrl,
        trackIds: selectedTracks.map(t => t._id),
        visibility,
      };

      const res = await authFetch(`/api/playlists/${activePlaylist._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update playlist");
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["user-playlists"] });
      alert("Playlist updated successfully");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update playlist");
    },
  });

  return (
    <div className="min-h-screen bg-neutral-950 px-6 flex items-center justify-center py-8">
          <div className="absolute top-4 right-4 z-50">
            <BackButton/>
          </div>
            
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* --- Playlist selection --- */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lg:col-span-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4 flex flex-col items-center"
        >
          <h2 className="text-lg font-semibold text-white text-center">Select Playlist</h2>
          <input
            placeholder="Search playlists..."
            value={searchPlaylist}
            onChange={e => setSearchPlaylist(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white mb-2"
          />
          <ul className="space-y-2 max-h-96 overflow-y-auto w-full">
            {filteredPlaylists.map(p => (
              <li
                key={p._id}
                onClick={() => setActivePlaylist(p)}
                className={`cursor-pointer px-3 py-2 rounded-lg w-full text-center ${
                  activePlaylist?._id === p._id
                    ? "bg-white text-neutral-900"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {p.title}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* --- Playlist editor --- */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 space-y-6 min-h-[400px]"
        >
          {activePlaylist ? (
            <>
              <h1 className="text-2xl font-semibold text-white">Update Playlist</h1>

              {/* Playlist name */}
              <input
                placeholder="Playlist Name"
                value={playlistName}
                onChange={e => {
                  setPlaylistName(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
              />

              {/* Visibility */}
              {!userLoading && isAdmin && (
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
                      <div className="w-1/2 flex items-center justify-center text-black">Private</div>
                      <div className="w-1/2 flex items-center justify-center text-black">Public</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image */}
              <label className="cursor-pointer w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 transition">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                {imagePreview ? (
                  <Image src={imagePreview} alt="Playlist cover" width={120} height={120} className="rounded-lg object-cover" />
                ) : (
                  <span className="text-neutral-400">Select playlist image</span>
                )}
              </label>

              {/* Track list + search + add */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
                <input
                  placeholder="Search tracks to add..."
                  value={trackSearch}
                  onChange={e => setTrackSearch(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white mb-3"
                />
                {trackSearch && filteredTracks.length > 0 && (
                  <ul className="max-h-64 overflow-y-auto space-y-1 border border-neutral-700 p-2 rounded-lg bg-neutral-800">
                    {filteredTracks.map(t => (
                      <li
                        key={t._id}
                        onClick={() => {
                          setSelectedTracks(prev => [...prev, t]);
                          setTrackSearch("");
                        }}
                        className="cursor-pointer px-2 py-1 rounded hover:bg-neutral-700 text-white"
                      >
                        {t.title} - {t.artist}
                      </li>
                    ))}
                  </ul>
                )}

                <Reorder.Group
                  axis="y"
                  values={selectedTracks}
                  onReorder={setSelectedTracks}
                  className="space-y-2 max-h-96 overflow-y-auto mt-2"
                >
                  {selectedTracks.map(track => (
                    <Reorder.Item
                      key={track._id}
                      value={track}
                      className="px-3 py-2 rounded-lg bg-neutral-800 text-white cursor-pointer hover:bg-neutral-700"
                    >
                      {track.title} - {track.artist}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              {/* Save */}
              <button
                onClick={() => handleUpdatePlaylist.mutate()}
                disabled={handleUpdatePlaylist.isPending || !playlistName || selectedTracks.length === 0}
                className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  handleUpdatePlaylist.isPending
                    ? "bg-green-500 text-white cursor-not-allowed"
                    : playlistName && selectedTracks.length
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-neutral-700 text-neutral-400 pointer-events-none"
                }`}
              >
                {handleUpdatePlaylist.isPending ? <><Spinner size={18} /> Saving...</> : "Save Playlist"}
                
              </button>
              {(!userLoading && (isAdmin)) && (

              <button
                onClick={() => {
                  if (!confirm("Are you sure you want to delete this playlist?")) return;
                  handleDeletePlaylist.mutate();
                }}
                disabled={handleDeletePlaylist.isPending}
                className="w-full py-3 rounded-lg font-medium transition bg-red-600 hover:bg-red-700 text-white"
              >
                {handleDeletePlaylist.isPending ? "Deleting..." : "Delete Playlist"}
              </button>)}

            </>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400 text-lg">
              Select a playlist to start editing
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
