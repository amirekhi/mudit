"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAudioStore, Track as TrackType } from "@/store/useAudioStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadSongs } from "@/lib/firebase/uploadSongs";
import { uploadImage } from "@/lib/firebase/uploadImage";
import Image from "next/image";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { extractAudioMetadata } from "@/lib/Mp3DataParser/extractAudioMetadata";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import  { useRouter } from "next/navigation";
import { DraftTrack } from "@/models/Track";
import BackButton from "@/components/basics/BackButton";


export default function CreateSongPage() {
  const [isDragging, setIsDragging] = useState(false);

  const [playlists, setPlaylists] = useState<{ _id: string; title: string }[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
//new



const [tracks, setTracks] = useState<DraftTrack[]>([]);
const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
const activeTrack = tracks.find(t => t.id === activeTrackId) || null;
// Determine if all tracks are public or private
const globalVisibility = tracks.every(t => t.visibility === "public") ? "public" : "private";
const updateActiveTrack = (patch: Partial<DraftTrack>) => {
  if (!activeTrack) return;

  setTracks(prev =>
    prev.map(t =>
      t.id === activeTrack.id ? { ...t, ...patch } : t
    )
  );
};


  const playTrack = useAudioStore((s) => s.playTrack);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const stop = useAudioStore((s) => s.stop);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  const queryClient = useQueryClient();

  const router = useRouter();

  //getting the user 
const { data: currentUser, isLoading } = useCurrentUser();
const isAdmin = currentUser?.role === "admin";



  // Fetch playlists
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
    draft.imageFile = new File(
      [metadata.image],
      "embedded-image",
      { type: metadata.image.type }
    );
    draft.imagePreview = URL.createObjectURL(metadata.image);
  }
} catch (err) {
  console.warn("Metadata extraction failed:", err);
}

setTracks(prev => {
  if (prev.length === 0) {
    setActiveTrackId(id);
  }
  return [...prev, draft];
});


};



   

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files?.[0] || null);
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

  // Mutation to create track
const createTracksMutation = useMutation({
  mutationFn: async () => {
    const tracksToUpload = tracks.filter(t => t.selected);
    if (!tracksToUpload.length) throw new Error("No tracks selected");

    // Upload all tracks
    const createdTracks = await Promise.all(
      tracksToUpload.map(async (t) => {
        const songUrl = await uploadSongs(t.file);
        const imageUrl = t.imageFile ? await uploadImage(t.imageFile) : undefined;

        const res = await authFetch("/api/tracks/public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.title,
            artist: t.artist,
            url: songUrl,
            image: imageUrl,
            visibility: t.visibility,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to create track");
        }

        return res.json();
      })
    );

    // Add tracks to selected playlists
    if (selectedPlaylists.length) {
      await authFetch("/api/playlists/addTrack", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackIds: createdTracks.map(t => t._id),
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



  // Local audio preview
const handleSelectTrack = (track: DraftTrack) => {
  setActiveTrackId(track.id);

  // Only set the global player when user explicitly clicks
  const audioTrack: TrackType = {
    _id: "local-preview",
    title: track.title || track.file.name,
    artist: track.artist || "Local file",
    url: URL.createObjectURL(track.file),
    visibility: track.visibility,
    createdAt: "",
    updatedAt: "",
  };

  playTrack(audioTrack); // sets currentTrack in useAudioStore
};




  return (
    <div className="min-h-screen bg-neutral-950 px-6 flex items-center">
          <div className="absolute top-4 right-4 z-50">
            <BackButton/>
          </div>
            
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Audio */}
       <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 flex flex-col"
                >
                  <h1 className="text-2xl font-semibold text-white mb-6">Import Song</h1>

                  {/* Drag & Drop */}
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
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        files.forEach(file => handleFileChange(file));
                      }}
                    />

                    {!activeTrack ? (
                      <p className="text-neutral-400">Drag & drop your audio file here, or click to browse</p>
                    ) : (
                      <div className="space-y-2 text-center">
                        <p className="text-white font-medium">File loaded</p>
                        <p className="text-sm text-neutral-400 truncate">{activeTrack.file.name}</p>
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

                  {/* Imported Tracks */}
                  {tracks.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 mt-6 flex-1 overflow-y-auto max-h-[360px]"
                    >
                      <h2 className="text-lg font-semibold text-white mb-4">Imported Tracks</h2>
                      <ul className="space-y-2">
                        {tracks.map((track) => {
                          const isActive = track.id === activeTrackId;
                          return (
                            <li
                              key={track.id}
                              onClick={() => handleSelectTrack(track)}
                              className={`cursor-pointer flex items-center justify-between rounded-lg px-3 py-2 transition ${
                                isActive
                                  ? "bg-white text-neutral-900"
                                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                {/* Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={track.selected}
                                  onClick={(e) => e.stopPropagation()} // prevent li click
                                  onChange={() =>
                                    setTracks(prev =>
                                      prev.map(t =>
                                        t.id === track.id ? { ...t, selected: !t.selected } : t
                                      )
                                    )
                                  }
                                />

                                <div className="truncate">
                                  <p className="font-medium truncate">{track.title || track.file.name}</p>
                                  <p className="text-sm opacity-70 truncate">{track.artist || "Unknown artist"}</p>
                                </div>
                              </div>

                              {isActive && <span className="text-xs font-semibold">Editing</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  )}
                </motion.div>

            

        {/* Right Side */}
        <div className="space-y-6">
        {/* Playlists */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 h-[220px] flex flex-col"
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            Add to Playlists
          </h2>

          <ul className="space-y-2 overflow-y-auto pr-1">
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
                  <span className="truncate">{playlist.title}</span>

                  <span
                    className={`h-4 w-4 flex items-center justify-center rounded-full border ${
                      checked ? "border-white" : "border-neutral-500"
                    }`}
                  >
                    {checked && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
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
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-white mb-2">Song Details</h2>
            <input
              placeholder="Song title"
              value={activeTrack?.title ?? ""}
              onChange={(e) => updateActiveTrack({ title: e.target.value })}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
            />
            <input
              placeholder="Artist"
              value={activeTrack?.artist ?? ""}
              onChange={(e) => updateActiveTrack({ artist: e.target.value })}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
            />

            {/* Public/Private Toggle */}
           {/* Public/Private Toggle */}
{!isLoading && isAdmin && (
  <div className="mt-4">
    <span className="text-white mb-2 block">Visibility:</span>
    <div
  className="relative w-40 h-10 flex items-center rounded-full bg-neutral-800 cursor-pointer select-none"
  onClick={() => {
    const newVisibility = globalVisibility === "public" ? "private" : "public";
    setTracks(prev => prev.map(t => ({ ...t, visibility: newVisibility })));
  }}
>
  {/* Sliding background */}
  <div
    className={`absolute top-0 left-0 h-full w-1/2 rounded-full bg-white transition-transform duration-300 ${
      globalVisibility === "public" ? "translate-x-full" : "translate-x-0"
    }`}
  ></div>

  {/* Labels */}
  <div className="relative flex w-full text-sm font-medium text-white z-10">
    <div
      className={`w-1/2 text-center py-2 transition-colors duration-300 ${
        globalVisibility === "private" ? "text-neutral-900" : "text-white"
      }`}
    >
      Private
    </div>
    <div
      className={`w-1/2 text-center py-2 transition-colors duration-300 ${
        globalVisibility === "public" ? "text-neutral-900" : "text-white"
      }`}
    >
      Public
    </div>
  </div>
</div>

  </div>
)}



            {/* Image Upload */}
            <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 text-center text-neutral-400 hover:border-white hover:text-white transition mt-4">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {!activeTrack?.imagePreview ? (
                <span>Drag & drop cover image, or click to select</span>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <span>Preview</span>
                  <Image
                    src={activeTrack.imagePreview}
                    alt="Preview"
                    width={120}
                    height={120}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
            </label>
          </motion.div>

          {/* Create Track Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
          >

            
            <button
              disabled={
                !activeTrack ||
                !activeTrack.title ||
                !activeTrack.artist ||
                createTracksMutation.isPending
              }
              onClick={() => createTracksMutation.mutate()}
              className={`w-full rounded-xl font-medium py-3 transition ${
                                !activeTrack ||
                !activeTrack.title ||
                !activeTrack.artist ||
                createTracksMutation.isPending
                  ? "bg-neutral-700 text-neutral-400 pointer-events-none"
                  : "bg-white text-neutral-900 hover:bg-neutral-200"
              }`}
            >
              {createTracksMutation.isPending ? "Uploading..." : "Create Track"}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

