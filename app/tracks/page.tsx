"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Track } from "@/store/useAudioStore";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { useAudioStore } from "@/store/useAudioStore";
import { IconSearch, IconMusic, IconLock, IconWorld, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import ThemeToggle from "@/components/basics/ThemeToggle";

export default function MyTracksPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const playTrack = useAudioStore(s => s.playTrack);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const { data: tracks = [], isLoading } = useQuery<Track[], Error>({
    queryKey: ["user-tracks"],
    queryFn: async () => {
      const res = await authFetch("/api/tracks/me");
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json() as Promise<Track[]>;
    },
  });

  const filtered = useMemo(() => {
    let result = tracks;
    if (filter !== "all") result = result.filter(t => t.visibility === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tracks, query, filter]);

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
    }`;

  return (
    <div className="min-h-full overflow-x-hidden bg-white dark:bg-transparent transition-colors">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-32 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">My Tracks</h1>
            {!isLoading && (
              <p className="text-sm text-neutral-500 mt-0.5">
                {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/createSong"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600
                hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Track</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search your tracks…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800
                text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2
                focus:ring-indigo-500 transition"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "public", "private"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={filterBtn(filter === f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 text-neutral-500 text-sm">
            Loading your tracks…
          </div>
        )}

        {/* Empty */}
        {!isLoading && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800
              flex items-center justify-center">
              <IconMusic className="w-7 h-7 text-neutral-400 dark:text-neutral-700" />
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 font-medium">No tracks yet</p>
            <p className="text-neutral-400 dark:text-neutral-600 text-sm text-center">
              Upload your first track to get started
            </p>
            <Link
              href="/createSong"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500
                text-white text-sm font-medium transition-colors"
            >
              Add Track
            </Link>
          </div>
        )}

        {/* No results */}
        {!isLoading && tracks.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-neutral-500 text-sm">
            No tracks matched your search
          </div>
        )}

        {/* Track list */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((track, i) => {
              const isActive = currentTrack?._id === track._id;
              return (
                <div
                  key={track._id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors group
                    border ${isActive
                      ? "bg-indigo-600/10 border-indigo-500/30"
                      : "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    }`}
                >
                  {/* Index / play indicator */}
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <button
                      onClick={() => {
                        if (isActive) togglePlay();
                        else playTrack(track);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center
                        bg-neutral-200 dark:bg-neutral-800 hover:bg-indigo-600 transition-colors"
                    >
                      {isActive && isPlaying ? (
                        <span className="flex gap-0.5 items-end h-3">
                          <span className="w-0.5 h-3 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-0.5 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-0.5 h-3 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 group-hover:hidden">{i + 1}</span>
                      )}
                      {!isActive && (
                        <svg className="hidden group-hover:block w-3.5 h-3.5 text-neutral-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Cover */}
                  <img
                    src={track.image || "/test.jpg"}
                    alt={track.title}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-neutral-200 dark:bg-neutral-800"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isActive ? "text-indigo-600 dark:text-indigo-300" : "text-neutral-900 dark:text-white"}`}>
                      {track.title}
                    </div>
                    <div className="text-xs text-neutral-500 truncate">{track.artist}</div>
                  </div>

                  {/* Visibility badge */}
                  <div className="flex-shrink-0 hidden sm:flex items-center gap-1 px-2 py-1
                    rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[10px] font-medium">
                    {track.visibility === "public"
                      ? <><IconWorld className="w-3 h-3" /> Public</>
                      : <><IconLock className="w-3 h-3" /> Private</>
                    }
                  </div>

                  {/* Detail link */}
                  <Link
                    href={`/tracks/${track._id}`}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-neutral-500 dark:text-neutral-400
                      hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}