"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconSearch, IconX, IconLoader2, IconExternalLink } from "@tabler/icons-react";
import { Track } from "@/store/useAudioStore";
import { useAudioStore } from "@/store/useAudioStore";
import {
  fetchItunesPreviews,
  itunesTrackToTrack,
} from "@/lib/TanStackQuery/Queries/fetchItunesPreviews";
import {
  fetchTelegramEffects,
  telegramResultToTrack,
} from "@/lib/TanStackQuery/Queries/fetchTelegramEffects";
import { fetchPublicTracksPage } from "@/lib/TanStackQuery/Queries/fetchPublicTracksPage";

interface Props {
  /**
   * Tracks to match locally — pass the signed-in user's own tracks (private
   * ones included, which the public search can't see). Public tracks are
   * searched on the server, so the page no longer has to load all of them.
   */
  tracks?: Track[];
  placeholder?: string;
}

const DEBOUNCE_MS = 300;
const SUGGESTIONS_PER_SOURCE = 6;

// Module-level on purpose: useDebouncedResults depends only on the query
// string, so these must be stable references.
const searchPublicTracks = async (q: string) =>
  (await fetchPublicTracksPage({ q, page: 1, pageSize: SUGGESTIONS_PER_SOURCE })).items;

const searchEffects = async (q: string) =>
  (await fetchTelegramEffects(q, SUGGESTIONS_PER_SOURCE)).map(telegramResultToTrack);

const searchItunes = async (q: string) =>
  (await fetchItunesPreviews(q)).slice(0, SUGGESTIONS_PER_SOURCE).map(itunesTrackToTrack);

// One debounced, race-safe search source. Each source gets its own instance,
// so a slow response from one never blanks out another.
function useDebouncedResults(query: string, fetcher: (q: string) => Promise<Track[]>) {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    // Bump the id even when we bail out, so an in-flight response for an
    // older query can't land after the box was cleared.
    const id = ++requestId.current;

    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const next = await fetcher(query);
        if (id === requestId.current) setResults(next);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return { results, loading };
}

interface ResultRowProps {
  track: Track;
  onPlay: () => void;
  /** Detail page for this track. Omit for sources with no page (iTunes previews). */
  href?: string;
  onNavigate?: () => void;
}

// One suggestion row. Clicking the row plays the track; the small info link
// (when there is a detail page) opens it instead. Library tracks and Telegram
// effects get identical treatment.
function ResultRow({ track, onPlay, href, onNavigate }: ResultRowProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3
        hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
      onMouseDown={e => e.preventDefault()}
      onClick={onPlay}
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
      {href && (
        <Link
          href={href}
          prefetch={false}
          aria-label={`Open ${track.title}`}
          onClick={e => {
            e.stopPropagation(); // don't also trigger the row's play
            onNavigate?.();
          }}
          className="flex-shrink-0 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900
            dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <IconExternalLink className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function SectionLabel({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
      {children}
      {loading && <IconLoader2 className="w-3 h-3 animate-spin" />}
    </div>
  );
}

export default function SearchBar({ tracks = [], placeholder = "Search for music..." }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const playTrack = useAudioStore(s => s.playTrack);

  const trimmed = query.trim();

  const publicSource = useDebouncedResults(trimmed, searchPublicTracks);
  const effectsSource = useDebouncedResults(trimmed, searchEffects);
  const itunesSource = useDebouncedResults(trimmed, searchItunes);

  // Library = the user's own tracks (matched locally, so private ones show
  // up) followed by public matches from the server, de-duplicated.
  const needle = trimmed.toLowerCase();
  const localMatches = trimmed.length < 2 ? [] : tracks.filter(t =>
    `${t.title} ${t.artist}`.toLowerCase().includes(needle)
  );
  const seen = new Set(localMatches.map(t => t._id));
  const librarySuggestions = [
    ...localMatches,
    ...publicSource.results.filter(t => !seen.has(t._id)),
  ].slice(0, SUGGESTIONS_PER_SOURCE);

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
    inputRef.current?.focus();
  };

  const play = (track: Track) => {
    playTrack(track);
    setOpen(false);
  };

  const anyLoading = publicSource.loading || effectsSource.loading || itunesSource.loading;
  const hasAnySuggestions =
    librarySuggestions.length > 0 ||
    effectsSource.results.length > 0 ||
    itunesSource.results.length > 0;

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
            <button onClick={clear} aria-label="Clear search" className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
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

          {/* Library matches — your own tracks first, then public ones */}
          {(librarySuggestions.length > 0 || publicSource.loading) && (
            <div>
              <SectionLabel loading={publicSource.loading}>From your library</SectionLabel>
              {librarySuggestions.map(track => (
                <ResultRow
                  key={track._id}
                  track={track}
                  href={`/tracks/${track._id}`}
                  onPlay={() => play(track)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          )}

          {/* Telegram effects — second, between your library and previews */}
          {(effectsSource.results.length > 0 || effectsSource.loading) && (
            <div>
              <SectionLabel loading={effectsSource.loading}>Effects</SectionLabel>
              {effectsSource.results.map(track => (
                <ResultRow
                  key={track._id}
                  track={track}
                  href={`/tracks/${track._id}`}
                  onPlay={() => play(track)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          )}

          {/* iTunes preview matches — last. No detail page exists for these. */}
          {(itunesSource.results.length > 0 || itunesSource.loading) && (
            <div>
              <SectionLabel loading={itunesSource.loading}>30-second previews</SectionLabel>
              {itunesSource.results.map(track => (
                <ResultRow key={track._id} track={track} onPlay={() => play(track)} />
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
      {open && trimmed.length >= 2 && !hasAnySuggestions && !anyLoading && (
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
