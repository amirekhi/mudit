"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconSearch, IconX, IconLoader2 } from "@tabler/icons-react";
import { Track } from "@/store/useAudioStore";
import { useAudioStore } from "@/store/useAudioStore";
import {
  fetchItunesPreviews,
  itunesTrackToTrack,
} from "@/lib/TanStackQuery/Queries/fetchItunesPreviews";

interface Props {
  tracks: Track[];        // the full library to search against for the dropdown
  placeholder?: string;
}

const DEBOUNCE_MS = 300;

export default function SearchBar({ tracks, placeholder = "Search for music..." }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [itunesResults, setItunesResults] = useState<Track[]>([]);
  const [itunesLoading, setItunesLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0); // guards against out-of-order responses

  const playTrack = useAudioStore(s => s.playTrack);

  const trimmed = query.trim();

  // local library matches — up to 6 suggestions
  const librarySuggestions = trimmed.length < 2 ? [] : tracks
    .filter(t =>
      `${t.title} ${t.artist}`.toLowerCase().includes(trimmed.toLowerCase())
    )
    .slice(0, 6);

  // debounced iTunes preview suggestions as the user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 2) {
      setItunesResults([]);
      setItunesLoading(false);
      return;
    }

    setItunesLoading(true);
    const thisRequestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const raw = await fetchItunesPreviews(trimmed);
        // ignore stale responses if the user kept typing
        if (thisRequestId !== requestIdRef.current) return;
        setItunesResults(raw.slice(0, 6).map(itunesTrackToTrack));
      } catch {
        if (thisRequestId === requestIdRef.current) setItunesResults([]);
      } finally {
        if (thisRequestId === requestIdRef.current) setItunesLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed]);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && trimmed) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSubmit = () => {
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const clear = () => {
    setQuery("");
    setOpen(false);
    setItunesResults([]);
    inputRef.current?.focus();
  };

  const hasAnySuggestions = librarySuggestions.length > 0 || itunesResults.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (trimmed.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-full border border-neutral-200 dark:border-neutral-700
            bg-neutral-100 dark:bg-neutral-800
            pl-11 pr-20 py-3 text-sm text-neutral-900 dark:text-white placeholder-neutral-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button onClick={clear} className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <IconX className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!trimmed}
            className="h-7 px-3 rounded-full bg-indigo-600 hover:bg-indigo-500
              text-xs text-white font-medium disabled:opacity-40 transition"
          >
            Go
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {open && hasAnySuggestions && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50
          bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden max-h-96 overflow-y-auto">

          {/* Library matches */}
          {librarySuggestions.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
                From your library
              </div>
              {librarySuggestions.map(track => (
                <div
                  key={track._id}
                  className="flex items-center gap-3 px-4 py-3
                    hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    playTrack(track);
                    setOpen(false);
                  }}
                >
                  <img
                    src={track.image || "/test.jpg"}
                    alt={track.title}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-neutral-200 dark:bg-neutral-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-neutral-900 dark:text-white font-medium truncate">{track.title}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* iTunes preview matches */}
          {(itunesResults.length > 0 || itunesLoading) && (
            <div>
              <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
                30-second previews
                {itunesLoading && <IconLoader2 className="w-3 h-3 animate-spin" />}
              </div>
              {itunesResults.map(track => (
                <div
                  key={track._id}
                  className="flex items-center gap-3 px-4 py-3
                    hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    playTrack(track);
                    setOpen(false);
                  }}
                >
                  <img
                    src={track.image || "/test.jpg"}
                    alt={track.title}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-neutral-200 dark:bg-neutral-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-neutral-900 dark:text-white font-medium truncate">{track.title}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer — full search link */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3
              border-t border-neutral-200 dark:border-neutral-800 text-xs text-indigo-600 dark:text-indigo-400
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              transition-colors font-medium"
          >
            <IconSearch className="w-3.5 h-3.5" />
            Search all results for "{trimmed}"
          </button>
        </div>
      )}

      {/* No results hint */}
      {open && trimmed.length >= 2 && !hasAnySuggestions && !itunesLoading && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50
          bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl">
          <div className="px-4 py-4 text-sm text-neutral-500 dark:text-neutral-500 text-center">
            No tracks found for "{trimmed}"
          </div>
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3
              border-t border-neutral-200 dark:border-neutral-800 text-xs text-indigo-600 dark:text-indigo-400
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              transition-colors font-medium"
          >
            <IconSearch className="w-3.5 h-3.5" />
            Search anyway
          </button>
        </div>
      )}
    </div>
  );
}