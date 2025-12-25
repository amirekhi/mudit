"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { uploadImage } from "@/lib/firebase/uploadImage";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { Track, useAudioStore } from "@/store/useAudioStore";

/* ---------------- debounce hook ---------------- */

function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

/* ---------------- page ---------------- */

export default function UpdateTrackPage() {
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const setTrack = useAudioStore(s => s.setTrack);

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);

  const [form, setForm] = useState({
    title: "",
    artist: "",
    visibility: "private" as "private" | "public",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<{ _id: string; title: string }[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const isDirty = useRef(false);

  /* ---------------- data ---------------- */

  const { data: tracks = [] } = useQuery({
    queryKey: ["my-tracks"],
    queryFn: async () => {
      const res = await authFetch("/api/tracks/me");
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
  });

  const filteredTracks = useMemo(() => {
    if (!debouncedSearch) return tracks;
    return tracks.filter((t: Track) =>
      `${t.title} ${t.artist}`.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [tracks, debouncedSearch]);

  useEffect(() => {
    authFetch("/api/playlists/me")
      .then(res => res.json())
      .then(setPlaylists);
  }, []);

  /* ---------------- unsaved warning ---------------- */

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  /* ---------------- select track ---------------- */

  const selectTrack = (track: Track) => {
    if (activeTrack?._id === track._id) return;

    if (isDirty.current && !confirm("You have unsaved changes. Discard them?")) {
      return;
    }

    setActiveTrack(track);
    setForm({
      title: track.title,
      artist: track.artist,
      visibility: track.visibility,
    });

    setImagePreview(track.image ?? null);
    setImageFile(null);
    setSelectedPlaylists([]);
    isDirty.current = false;

    // load into player (paused)
    setTrack(track);
  };

  /* ---------------- update mutation ---------------- */

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!activeTrack) throw new Error("No track selected");

      let imageUrl = activeTrack.image;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload: any = {
        title: form.title,
        artist: form.artist,
        image: imageUrl,
      };

      if (isAdmin) {
        payload.visibility = form.visibility;
      }

      const res = await authFetch(`/api/tracks/${activeTrack._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update track");

      if (selectedPlaylists.length) {
        await authFetch("/api/playlists/addTrack", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackIds: [activeTrack._id],
            playlistIds: selectedPlaylists,
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tracks"] });
      isDirty.current = false;
      setSelectedPlaylists([]);
      alert("Track updated successfully");
    },
  });

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-neutral-950 px-6 flex items-center">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Track list */}
        <motion.div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h1 className="text-2xl font-semibold text-white mb-4">Your Tracks</h1>

          <input
            placeholder="Search tracks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-4 w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white"
          />

          <ul className="space-y-2 max-h-[440px] overflow-y-auto">
            {filteredTracks.map((t: Track) => (
              <li
                key={t._id}
                onClick={() => selectTrack(t)}
                className={`cursor-pointer rounded-lg px-4 py-3 transition ${
                  activeTrack?._id === t._id
                    ? "bg-white text-neutral-900"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                <p className="font-medium truncate">{t.title}</p>
                <p className="text-sm opacity-70 truncate">{t.artist}</p>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Editor */}
        <div className="space-y-6">
          <motion.div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <fieldset disabled={!activeTrack} className="space-y-4 disabled:opacity-50">
              <h2 className="text-lg font-semibold text-white">Edit Track</h2>

              <input
                value={form.title}
                onChange={e => {
                  if (e.target.value !== form.title) isDirty.current = true;
                  setForm(f => ({ ...f, title: e.target.value }));
                }}
                placeholder="Track title"
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white"
              />

              <input
                value={form.artist}
                onChange={e => {
                  if (e.target.value !== form.artist) isDirty.current = true;
                  setForm(f => ({ ...f, artist: e.target.value }));
                }}
                placeholder="Artist"
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white"
              />

              {!userLoading && isAdmin && (
                <div>
                  <span className="text-white block mb-2">Visibility</span>
                  <div
                    onClick={() => {
                      isDirty.current = true;
                      setForm(f => ({
                        ...f,
                        visibility: f.visibility === "public" ? "private" : "public",
                      }));
                    }}
                    className="relative w-40 h-10 rounded-full bg-neutral-800 cursor-pointer"
                  >
                    <div
                      className={`absolute top-0 left-0 h-full w-1/2 bg-white rounded-full transition-transform ${
                        form.visibility === "public" ? "translate-x-full" : "translate-x-0"
                      }`}
                    />
                    <div className="relative z-10 flex h-full text-sm font-medium">
                      <div className={`w-1/2 flex items-center justify-center ${form.visibility === "private" ? "text-neutral-900" : "text-white"}`}>
                        Private
                      </div>
                      <div className={`w-1/2 flex items-center justify-center ${form.visibility === "public" ? "text-neutral-900" : "text-white"}`}>
                        Public
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 text-neutral-400 hover:border-white">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    isDirty.current = true;
                    setImageFile(f);
                    setImagePreview(URL.createObjectURL(f));
                  }}
                />
                {imagePreview ? (
                  <Image src={imagePreview} alt="cover" width={120} height={120} className="rounded-lg object-cover" />
                ) : (
                  <span>Select cover image</span>
                )}
              </label>
            </fieldset>
          </motion.div>

          {/* Playlists */}
          <motion.div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Add to Playlists</h2>
            <ul className="space-y-2 max-h-[160px] overflow-y-auto">
              {playlists.map(p => {
                const checked = selectedPlaylists.includes(p._id);
                return (
                  <li
                    key={p._id}
                    onClick={() => {
                      isDirty.current = true;
                      setSelectedPlaylists(prev =>
                        checked ? prev.filter(id => id !== p._id) : [...prev, p._id]
                      );
                    }}
                    className="cursor-pointer flex justify-between px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    <span className="truncate">{p.title}</span>
                    {checked && <span>✓</span>}
                  </li>
                );
              })}
            </ul>
          </motion.div>

          {/* Save */}
          <motion.div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <button
              disabled={!activeTrack || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className={`w-full rounded-xl py-3 font-medium transition ${
                !activeTrack
                  ? "bg-neutral-700 text-neutral-400"
                  : "bg-white text-neutral-900 hover:bg-neutral-200"
              }`}
            >
              {updateMutation.isPending ? "Saving..." : "Update Track"}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
