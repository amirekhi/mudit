"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { IconTrash, IconEdit, IconLock, IconWorld } from "@tabler/icons-react";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { Playlist } from "@/components/PlayList/PlaylistCard";
import BackButton from "@/components/basics/BackButton";
import ShareButton from "@/components/PlayList/ShareButton";
import Link from "next/link";

export default function PlaylistsPage() {
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading } = useQuery<Playlist[]>({
    queryKey: ["playlists", "me"],
    queryFn: async () => {
      const res = await authFetch("/api/playlists/me");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/playlists/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists", "me"] }),
  });

  return (
    <div className="min-h-screen bg-neutral-950 px-6">
      <div className="max-w-5xl mx-auto w-full my-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-white">Your Playlists</h1>
            <p className="text-sm text-neutral-400 mt-0.5">{playlists.length} playlist{playlists.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/createPlaylist"
              className="px-4 py-2 rounded-xl bg-white text-neutral-900 text-sm font-medium hover:bg-neutral-200 transition"
            >
              + New
            </Link>
            <BackButton />
          </div>
        </div>

        {isLoading ? (
          <div className="text-neutral-500 text-center py-24">Loading…</div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-neutral-300 font-medium">No playlists yet</p>
            <Link href="/createPlaylist" className="text-indigo-400 text-sm hover:text-indigo-300">
              Create your first playlist
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist, i) => (
              <motion.div
                key={playlist._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden"
              >
                <img
                  src={playlist.image || "/test.jpg"}
                  alt={playlist.title}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold truncate">{playlist.title}</h3>
                      {playlist.description && (
                        <p className="text-neutral-400 text-xs mt-0.5 line-clamp-2">{playlist.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 mt-0.5">
                      {playlist.visibility === "public"
                        ? <IconWorld className="w-4 h-4 text-indigo-400" />
                        : <IconLock className="w-4 h-4 text-neutral-500" />}
                    </span>
                  </div>

                  <p className="text-neutral-500 text-xs">{playlist.tracks?.length ?? 0} tracks</p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <ShareButton playlistId={playlist._id} playlistVisibility={playlist.visibility} />
                    <Link
                      href={`/edit/updatePlaylist/${playlist._id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-700
                        bg-neutral-800 text-white text-sm hover:bg-neutral-700 transition"
                    >
                      <IconEdit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm("Delete this playlist?")) deleteMutation.mutate(playlist._id);
                      }}
                      className="p-2 rounded-xl border border-neutral-700 bg-neutral-800
                        text-red-400 hover:bg-neutral-700 hover:text-red-300 transition"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}