"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { storage } from "@/lib/storage/storage";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { Track, useAudioStore } from "@/store/useAudioStore";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";

function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function UpdateTrackPageInner() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("id");

  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const setTrack = useAudioStore(s => s.setTrack);

  const [activeTrack,      setActiveTrack]      = useState<Track | null>(null);
  const [form,             setForm]             = useState({ title: "", artist: "", visibility: "private" as "private" | "public" });
  const [imageFile,        setImageFile]        = useState<File | null>(null);
  const [imagePreview,     setImagePreview]     = useState<string | null>(null);
  const [playlists,        setPlaylists]        = useState<{ _id: string; title: string }[]>([]);
  const [selectedPlaylists,setSelectedPlaylists]= useState<string[]>([]);
  const [search,           setSearch]           = useState("");
  const debouncedSearch = useDebounce(search);
  const isDirty = useRef(false);
  const [showEditor, setShowEditor] = useState(false);

  const { data: tracks = [] } = useQuery({
    queryKey: ["my-tracks"],
    queryFn: async () => {
      const res = await authFetch("/api/tracks/me");
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
  });

  const filteredTracks = useMemo(() =>
    debouncedSearch
      ? tracks.filter((t: Track) =>
          `${t.title} ${t.artist}`.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : tracks,
    [tracks, debouncedSearch]
  );

  useEffect(() => {
    authFetch("/api/playlists/me").then(r => r.json()).then(setPlaylists);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Auto-select track from URL param once tracks are loaded
  useEffect(() => {
    if (!preselectedId || !tracks.length || activeTrack) return;
    const found = tracks.find((t: Track) => t._id === preselectedId);
    if (!found) return;
    selectTrack(found);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedId, tracks]);

  const selectTrack = (track: Track) => {
    if (activeTrack?._id === track._id) { setShowEditor(true); return; }
    if (isDirty.current && !confirm("Discard unsaved changes?")) return;

    setActiveTrack(track);
    setForm({ title: track.title, artist: track.artist, visibility: track.visibility });
    setImagePreview(track.image ?? null);
    setImageFile(null);
    setSelectedPlaylists([]);
    isDirty.current = false;
    setTrack(track);
    setShowEditor(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeTrack) throw new Error("No track selected");
      const res = await authFetch(`/api/tracks/${activeTrack._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete track");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tracks"] });
      setActiveTrack(null);
      setImageFile(null);
      setImagePreview(null);
      setSelectedPlaylists([]);
      isDirty.current = false;
      setShowEditor(false);
      alert("Track deleted");
    },
    onError: (err: any) => alert(err.message || "Failed to delete"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!activeTrack) throw new Error("No track selected");
      let imageUrl = activeTrack.image;
      if (imageFile) imageUrl = await storage.uploadImage(imageFile);

      const payload: any = { title: form.title, artist: form.artist, image: imageUrl };
      if (isAdmin) payload.visibility = form.visibility;

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
          body: JSON.stringify({ trackIds: [activeTrack._id], playlistIds: selectedPlaylists }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tracks"] });
      isDirty.current = false;
      setSelectedPlaylists([]);
      alert("Track updated");
    },
    onError: (err: any) => alert(err.message || "Failed to update"),
  });

  const inputCls =
    "w-full rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 text-sm " +
    "text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="min-h-full overflow-x-hidden bg-white dark:bg-transparent transition-colors">
      <div className="p-4 sm:p-6 pb-10 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showEditor && (
              <button
                onClick={() => setShowEditor(false)}
                className="sm:hidden text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
              >
                ← Tracks
              </button>
            )}
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white hidden sm:block">Edit Tracks</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

          {/* Track list */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`sm:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 transition-colors
              ${showEditor ? "hidden sm:block" : "block"}`}
          >
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">Your Tracks</h2>

            <input
              placeholder="Search tracks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${inputCls} mb-3`}
            />

            <ul className="space-y-1.5 max-h-[60vh] sm:max-h-[440px] overflow-y-auto">
              {filteredTracks.map((t: Track) => (
                <li
                  key={t._id}
                  onClick={() => selectTrack(t)}
                  className={`cursor-pointer rounded-xl px-4 py-3 transition ${
                    activeTrack?._id === t._id
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  }`}
                >
                  <p className="font-medium text-sm truncate">{t.title}</p>
                  <p className="text-xs opacity-70 truncate">{t.artist}</p>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Editor panel */}
          <div className={`space-y-4 ${!showEditor && !activeTrack ? "hidden sm:block" : "block"}`}>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 transition-colors"
            >
              <fieldset disabled={!activeTrack} className="space-y-3 disabled:opacity-40">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Edit Track</h2>

                <input
                  value={form.title}
                  onChange={e => { isDirty.current = true; setForm(f => ({ ...f, title: e.target.value })); }}
                  placeholder="Track title"
                  className={inputCls}
                />

                <input
                  value={form.artist}
                  onChange={e => { isDirty.current = true; setForm(f => ({ ...f, artist: e.target.value })); }}
                  placeholder="Artist"
                  className={inputCls}
                />

                {!userLoading && isAdmin && (
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1.5">Visibility</span>
                    <div
                      onClick={() => {
                        isDirty.current = true;
                        setForm(f => ({ ...f, visibility: f.visibility === "public" ? "private" : "public" }));
                      }}
                      className="relative w-40 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 cursor-pointer select-none"
                    >
                      <div className={`absolute top-0 left-0 h-full w-1/2 bg-white dark:bg-neutral-900 rounded-full transition-transform shadow ${
                        form.visibility === "public" ? "translate-x-full" : "translate-x-0"
                      }`} />
                      <div className="relative z-10 flex h-full text-xs font-medium">
                        <div className={`w-1/2 flex items-center justify-center ${form.visibility === "private" ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}>
                          Private
                        </div>
                        <div className={`w-1/2 flex items-center justify-center ${form.visibility === "public" ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}>
                          Public
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-4 text-neutral-500 text-sm hover:border-neutral-400 dark:hover:border-neutral-500 transition">
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
                    <Image src={imagePreview} alt="Cover" width={100} height={100} className="rounded-xl object-cover" />
                  ) : (
                    <span>Select cover image</span>
                  )}
                </label>
              </fieldset>
            </motion.div>

            {/* Playlists */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 transition-colors"
            >
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">Add to Playlists</h2>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
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
                      className="flex justify-between items-center cursor-pointer px-3 py-2 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span className="truncate">{p.title}</span>
                      {checked && <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-2">✓</span>}
                    </li>
                  );
                })}
              </ul>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3 transition-colors"
            >
              <button
                disabled={!activeTrack || updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
                className="w-full rounded-xl py-3 font-medium text-sm transition
                  disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed
                  enabled:bg-neutral-900 dark:enabled:bg-white enabled:text-white dark:enabled:text-neutral-900 enabled:hover:bg-neutral-700 dark:enabled:hover:bg-neutral-200"
              >
                {updateMutation.isPending ? "Saving…" : "Update Track"}
              </button>

              {activeTrack && activeTrack.visibility !== "public" && (
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (!confirm("Delete this track permanently?")) return;
                    deleteMutation.mutate();
                  }}
                  className="w-full rounded-xl py-3 font-medium text-sm transition bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete Track"}
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpdateTrackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
        Loading…
      </div>
    }>
      <UpdateTrackPageInner />
    </Suspense>
  );
}