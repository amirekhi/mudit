import { useQuery } from "@tanstack/react-query";
import { Track } from "@/store/useAudioStore";

/**
 * Resolves a YouTube video id for a track (null when none was found).
 * One lookup per track per session; the server route caches across sessions.
 */
export function useTrackVideo(track: Track | null) {
  return useQuery<string | null>({
    queryKey: ["track-video", track?._id],
    enabled: !!track,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        title: track!.title,
        artist: track!.artist,
      });
      const res = await fetch(`/api/youtube/search?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.videoId as string | null) ?? null;
    },
  });
}