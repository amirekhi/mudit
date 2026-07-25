"use client";

import { useQuery } from "@tanstack/react-query";
import { parseLrc, LyricLine } from "@/lib/lyrics/lrcParser";

export interface LyricsResult {
  found: boolean;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
  parsedLines: LyricLine[];
}

async function fetchLyrics(track: string, artist: string): Promise<LyricsResult> {
  const params = new URLSearchParams({ track });
  if (artist) params.set("artist", artist);

  const res = await fetch(`/api/lyrics?${params.toString()}`);
  if (!res.ok) {
    return { found: false, instrumental: false, plainLyrics: null, syncedLyrics: null, parsedLines: [] };
  }

  const data = await res.json();
  return {
    found: data.found,
    instrumental: data.instrumental,
    plainLyrics: data.plainLyrics,
    syncedLyrics: data.syncedLyrics,
    parsedLines: data.syncedLyrics ? parseLrc(data.syncedLyrics) : [],
  };
}

export function useLyrics(title?: string, artist?: string) {
  return useQuery({
    queryKey: ["lyrics", title, artist],
    queryFn: () => fetchLyrics(title!, artist ?? ""),
    enabled: !!title,
    staleTime: 1000 * 60 * 60 * 24, // lyrics don't change — safe to cache client-side for a day
    retry: 1,
  });
}