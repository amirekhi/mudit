import { useQuery } from "@tanstack/react-query";
import { Track } from "@/store/useAudioStore";

export interface TrackVideo {
  videoId: string;
  /** Length of the YouTube video in seconds. */
  duration: number;
}

/**
 * Finds the best YouTube video for a track (null when nothing good exists).
 * Waits until the audio's duration is known (trackDuration !== null) because
 * the server uses it to tell the real video from edits and live versions.
 * One lookup per track per session; the server route caches across sessions.
 */
export function useTrackVideo(track: Track | null, trackDuration: number | null) {
  return useQuery<TrackVideo | null>({
    queryKey: ["track-video", track?._id],
    enabled: !!track && trackDuration !== null,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        title: track!.title,
        artist: track!.artist,
      });
      if (trackDuration) params.set("duration", String(trackDuration));

      const res = await fetch(`/api/youtube/search?${params}`);
      if (!res.ok) return null;

      const data = await res.json();
      return data.videoId
        ? { videoId: data.videoId as string, duration: (data.duration as number) ?? 0 }
        : null;
    },
  });
}