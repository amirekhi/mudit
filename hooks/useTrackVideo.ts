import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Track } from "@/store/useAudioStore";

export interface TrackVideo {
  videoId: string;
  /** Length of the YouTube video in seconds. */
  duration: number;
}

// A track must stay current this long before we spend a lookup on it, so
// skipping rapidly through tracks doesn't fire a request (and ~100 quota
// units) for every track you pass.
const SETTLE_MS = 700;

// A stored "nothing found" is trusted for this long, then retried.
const MISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Only tracks stored in our database (Mongo ObjectIds) can have a saved video.
// Telegram effects, iTunes previews etc. never get a lookup.
const isDbTrackId = (id: string) => /^[0-9a-f]{24}$/i.test(id);

/**
 * What the track already knows from the database:
 *   TrackVideo  = we have a saved video
 *   null        = nothing to show (searched recently with no result, or not a DB track)
 *   undefined   = unknown: ask the server
 */
function storedResult(track: Track | null): TrackVideo | null | undefined {
  if (!track) return undefined;
  if (!isDbTrackId(track._id)) return null;

  const y = track.youtube;
  if (!y) return undefined;

  // A saved match is only valid for the title/artist it was found for, so a
  // renamed track gets looked up again. Manual picks always stand.
  const fresh = y.source === "manual" || (y.forTitle === track.title && y.forArtist === track.artist);
  if (!fresh) return undefined;

  if (y.videoId) return { videoId: y.videoId, duration: y.duration ?? 0 };

  const checked = y.checkedAt ? new Date(y.checkedAt).getTime() : 0;
  return Date.now() - checked < MISS_TTL_MS ? null : undefined;
}

/**
 * Finds the best YouTube video for a track (null when nothing good exists).
 *
 *  1. If the track already carries a saved match, use it: no request at all.
 *  2. Otherwise wait for the track to settle (debounce) and for the audio's
 *     duration to be known, then ask the server once. The server saves the
 *     result on the track, so it's never looked up again.
 */
export function useTrackVideo(track: Track | null, trackDuration: number | null) {
  const trackId = track?._id;

  // Debounce: only "settled" once this track has been current for SETTLE_MS.
  const [settledId, setSettledId] = useState<string | null>(null);
  useEffect(() => {
    if (!trackId) {
      setSettledId(null);
      return;
    }
    const timer = setTimeout(() => setSettledId(trackId), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [trackId]);
  const settled = !!trackId && settledId === trackId;

  return useQuery<TrackVideo | null>({
    queryKey: ["track-video", trackId],
    // Disabled queries still return cached data, so revisiting a track is instant.
    enabled: !!track && settled && trackDuration !== null,
    initialData: storedResult(track),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
    // `signal` lets React Query cancel the request if the track changes first.
    queryFn: async ({ signal }) => {
      // The server reads title/artist from the database itself; we only say which track.
      const params = new URLSearchParams({ trackId: track!._id });
      if (trackDuration) params.set("duration", String(trackDuration));

      const res = await fetch(`/api/youtube/search?${params}`, { signal });
      if (!res.ok) return null;

      const data = await res.json();
      return data.videoId
        ? { videoId: data.videoId as string, duration: (data.duration as number) ?? 0 }
        : null;
    },
  });
}