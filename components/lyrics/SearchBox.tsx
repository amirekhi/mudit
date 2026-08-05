"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Music2, ListMusic } from "lucide-react";
import { slugify } from "@/lib/slug";

interface Result {
  trackName: string;
  artistName: string;
  albumName: string;
}

const DEBOUNCE_MS = 300;

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const performSearch = (q: string) => {
    const currentId = ++requestIdRef.current;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/lyrics/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (currentId === requestIdRef.current) {
          setResults(data.results ?? []);
        }
      } catch {
        if (currentId === requestIdRef.current) setResults([]);
      }
    });
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setHasSearched(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => performSearch(value), DEBOUNCE_MS);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">
          Find any lyrics
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-base max-w-md mx-auto">
          Search by song title or artist to instantly find synced lyrics for your favorite tracks.
        </p>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Escape") handleClear();
          }}
          placeholder="Search by song or artist…"
          autoFocus
          className="w-full pl-12 pr-11 py-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-base shadow-sm outline-none transition-all duration-200 focus:border-neutral-400 dark:focus:border-neutral-600 focus:shadow-md focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5"
        />

        <AnimatePresence>
          {query && (
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* States */}
      <div className="mt-5 min-h-[4rem]">
        <AnimatePresence mode="wait">
          {isPending && (
            <motion.ul
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {[0, 1, 2].map(i => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                  className="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800/60"
                />
              ))}
            </motion.ul>
          )}

          {!isPending && hasSearched && results.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center py-10"
            >
              <Music2 className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-700 mb-3" strokeWidth={1.5} />
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                No lyrics found for{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">“{query}”</span>
              </p>
              <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
                Try checking the spelling or searching by artist name instead.
              </p>
            </motion.div>
          )}

          {!isPending && !hasSearched && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="text-center py-10"
            >
              <ListMusic className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-700 mb-3" strokeWidth={1.5} />
              <p className="text-neutral-400 dark:text-neutral-500 text-sm">
                Start typing to search millions of songs
              </p>
            </motion.div>
          )}

          {!isPending && results.length > 0 && (
            <motion.ul
              key="results"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04 } },
              }}
              className="space-y-1.5"
            >
              {results.map((r, i) => (
                <motion.li
                  key={`${r.artistName}-${r.trackName}-${i}`}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={`/lyrics/${slugify(r.artistName)}/${slugify(r.trackName)}`}
                    className="flex flex-col px-4 py-3 rounded-xl border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150"
                  >
                    <span className="text-neutral-900 dark:text-white font-medium truncate">
                      {r.trackName}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400 text-sm truncate">
                      {r.artistName}
                      {r.albumName ? ` · ${r.albumName}` : ""}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}