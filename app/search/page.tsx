"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Track } from "@/store/useAudioStore";
import { fetchSongs } from "@/lib/TanStackQuery/Queries/fetchSongs";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import SearchMusicCard from "@/components/basics/SearchMusicCard";
import SearchBar from "@/components/basics/SearchBar";
import ThemeToggle from "@/components/basics/ThemeToggle";
import { IconSearch, IconAdjustmentsHorizontal } from "@tabler/icons-react";
import MusicCard from "@/components/explorerUi/MusicCard";

type SortOption = "relevance" | "title" | "artist";
type VisibilityFilter = "all" | "public" | "private";

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q")?.trim() ?? "";

  const [sort, setSort] = useState<SortOption>("relevance");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: publicTracks = [], isLoading: publicLoading } =
    useQuery<Track[], Error>({ queryKey: ["songs"], queryFn: fetchSongs });

  const { data: userTracks = [], isLoading: userLoading } =
    useQuery<Track[], Error>({
      queryKey: ["user-tracks"],
      queryFn: async () => {
        try {
          const res = await authFetch("/api/tracks/me");
          if (!res.ok) throw new Error();
          return res.json() as Promise<Track[]>;
        } catch { return []; }
      },
    });

  const isLoading = publicLoading || userLoading;

  const allTracks = [
    ...publicTracks,
    ...userTracks.filter(ut => !publicTracks.some(pt => pt._id === ut._id)),
  ];

  let results = q
    ? allTracks.filter(t =>
        `${t.title} ${t.artist}`.toLowerCase().includes(q.toLowerCase())
      )
    : [];

  // visibility filter
  if (visibility !== "all") {
    results = results.filter(t => t.visibility === visibility);
  }

  // sort
  if (sort === "title") {
    results = [...results].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "artist") {
    results = [...results].sort((a, b) => a.artist.localeCompare(b.artist));
  }

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
    }`;

  return (
    <div className="min-h-full overflow-x-hidden bg-white dark:bg-transparent transition-colors">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-32 flex flex-col gap-6">

        {/* Search bar for further searches */}
        <div className="flex items-center gap-3 w-full max-w-xl mx-auto">
          <div className="flex-1">
            <SearchBar tracks={allTracks} placeholder={`Search again…`} />
          </div>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
              <IconSearch className="w-3.5 h-3.5" />
              <span>Results for</span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">"{q}"</h1>
            {!isLoading && (
              <p className="text-sm text-neutral-500 mt-1">
                {results.length} {results.length === 1 ? "track" : "tracks"} found
              </p>
            )}
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              border transition-colors ${
              filtersOpen
                ? "bg-indigo-600/10 dark:bg-indigo-600/20 border-indigo-400/40 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300"
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <IconAdjustmentsHorizontal className="w-4 h-4" />
            Filters
            {(sort !== "relevance" || visibility !== "all") && (
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-4 flex flex-col sm:flex-row gap-5">

            {/* Sort */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Sort by</span>
              <div className="flex gap-2 flex-wrap">
                {(["relevance", "title", "artist"] as SortOption[]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSort(opt)}
                    className={filterBtn(sort === opt)}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

            {/* Visibility */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Visibility</span>
              <div className="flex gap-2 flex-wrap">
                {(["all", "public", "private"] as VisibilityFilter[]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setVisibility(opt)}
                    className={filterBtn(visibility === opt)}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            {(sort !== "relevance" || visibility !== "all") && (
              <button
                onClick={() => { setSort("relevance"); setVisibility("all"); }}
                className="sm:ml-auto self-end text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 text-neutral-500">
            Searching…
          </div>
        )}

        {/* No results */}
        {!isLoading && results.length === 0 && q && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
              <IconSearch className="w-7 h-7 text-neutral-400 dark:text-neutral-700" />
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 font-medium">No tracks matched "{q}"</p>
            <p className="text-neutral-400 dark:text-neutral-600 text-sm">Try a different title or artist name</p>
          </div>
        )}

        {/* Results grid */}
        {!isLoading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {results.map(track => (
            <SearchMusicCard key={track._id} track={track} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full text-neutral-500">
        Loading…
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}