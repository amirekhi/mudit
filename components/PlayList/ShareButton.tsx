"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconShare, IconLink, IconTrash, IconClock, IconCheck } from "@tabler/icons-react";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";

interface ShareSession {
  cryptoId: string;
  expiresAt: string;
  createdAt: string;
}

interface ShareButtonProps {
  playlistId: string;
  playlistVisibility: "public" | "private";
}

const EXPIRY_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

export default function ShareButton({ playlistId, playlistVisibility }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ShareSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState(24);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await authFetch(`/api/share/list/${playlistId}`);
      if (res.ok) setSessions(await res.json());
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    loadSessions();
  };

  const handleCreate = async () => {
    // Public playlists just copy a direct URL
    if (playlistVisibility === "public") {
      const url = `${baseUrl}/share/public/${playlistId}`;
      await navigator.clipboard.writeText(url);
      setCopiedId("public");
      setTimeout(() => setCopiedId(null), 2000);
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, expiresInHours: selectedHours }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions((prev) => [{ cryptoId: data.cryptoId, expiresAt: data.expiresAt, createdAt: new Date().toISOString() }, ...prev]);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (cryptoId: string) => {
    await navigator.clipboard.writeText(`${baseUrl}/share/${cryptoId}`);
    setCopiedId(cryptoId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (cryptoId: string) => {
    await authFetch(`/api/share/delete/${cryptoId}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.cryptoId !== cryptoId));
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700
          bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      >
        <IconShare className="w-4 h-4" />
        Share
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-neutral-900 dark:text-white font-semibold text-lg">Share Playlist</h3>
                <button onClick={() => setOpen(false)} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-white text-xl leading-none">✕</button>
              </div>

              {playlistVisibility === "public" ? (
                <div className="space-y-3">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">This playlist is public — anyone with the link can access it.</p>
                  <button
                    onClick={handleCreate}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
                  >
                    {copiedId === "public" ? <IconCheck className="w-4 h-4" /> : <IconLink className="w-4 h-4" />}
                    {copiedId === "public" ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">This playlist is private. Create a time-limited link to share it.</p>

                  {/* Expiry picker */}
                  <div className="space-y-2">
                    <span className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Link expires after</span>
                    <div className="flex gap-2 flex-wrap">
                      {EXPIRY_OPTIONS.map((opt) => (
                        <button
                          key={opt.hours}
                          onClick={() => setSelectedHours(opt.hours)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                            selectedHours === opt.hours
                              ? "bg-indigo-600 text-white"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-50"
                  >
                    {creating ? "Creating…" : "Generate Link"}
                  </button>

                  {/* Active sessions */}
                  {loadingSessions ? (
                    <p className="text-neutral-500 text-sm">Loading links…</p>
                  ) : sessions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Active links</span>
                      {sessions.map((s) => (
                        <div key={s.cryptoId} className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-neutral-900 dark:text-white text-xs font-mono truncate">{`/share/${s.cryptoId.slice(0, 16)}…`}</p>
                            <div className="flex items-center gap-1 text-neutral-500 text-xs mt-0.5">
                              <IconClock className="w-3 h-3" />
                              <span>Expires {new Date(s.expiresAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopy(s.cryptoId)}
                            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                          >
                            {copiedId === s.cryptoId ? <IconCheck className="w-4 h-4 text-green-600 dark:text-green-400" /> : <IconLink className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(s.cryptoId)}
                            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}