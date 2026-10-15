/// <reference types="youtube" />
"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioStore } from "@/store/useAudioStore";
import { useTrackVideo } from "@/hooks/useTrackVideo";

// Shown when YouTube has nothing usable for the current track (no result,
// API/quota error, embedding blocked, player error, or the IFrame script
// failing to load). Set to null to disable the fallback.
const FALLBACK_VIDEO_URL: string | null = "/videos/video1.mp4";

type YTWindow = Window & {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
};

// Load the IFrame API script once, no matter how many times this mounts.
// Rejects if the script can't load (blocked, offline) so we can fall back.
let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        apiPromise = null; // allow a retry on a later track
        script.remove();
        reject(new Error("YouTube IFrame API failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

/**
 * Decorative, muted music-video backdrop for whatever is playing.
 * Tries YouTube first; falls back to a local video if that doesn't work out.
 * Audio still comes from Howler; this only follows play/pause.
 * Mount once, inside the QueryClientProvider (e.g. in your root layout).
 */
export default function VideoBackground() {
  const track = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const { data: videoId, isPending } = useTrackVideo(track);

  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const currentVideoIdRef = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);

  // The video id YouTube refused to play (embedding blocked, removed, etc.)
  const [failedId, setFailedId] = useState<string | null>(null);

  // Fallback is used once the lookup has finished and came up empty, or the
  // video it found turned out to be unplayable. While the lookup is still in
  // flight nothing is shown, so there's no flash of the fallback.
  const useFallback =
    !!FALLBACK_VIDEO_URL &&
    !!track &&
    !isPending &&
    (!videoId || failedId === videoId);

  const fallbackRef = useRef<HTMLVideoElement>(null);
  const [fallbackLoaded, setFallbackLoaded] = useState(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!useFallback) setFallbackLoaded(false);
  }, [useFallback]);

  // ── Fallback video: follow the audio's play/pause ──
  useEffect(() => {
    const el = fallbackRef.current;
    if (!el || !useFallback) return;
    if (isPlaying) el.play().catch(() => {}); // muted, so autoplay is allowed
    else el.pause();
  }, [isPlaying, useFallback, fallbackLoaded]);

  // ── YouTube: create the player once, then swap videos with loadVideoById ──
  useEffect(() => {
    currentVideoIdRef.current = videoId ?? null;

    if (!videoId) {
      setVisible(false);
      playerRef.current?.pauseVideo?.();
      return;
    }

    let cancelled = false;
    setVisible(false); // fade out the old video while the new one loads

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !hostRef.current) return;

        const existing = playerRef.current;
        if (existing?.loadVideoById) {
          existing.loadVideoById(videoId);
          if (!isPlayingRef.current) existing.pauseVideo();
          return;
        }

        // The API replaces the element it's given with an <iframe>, so give it
        // a throwaway div instead of one React owns.
        const mount = document.createElement("div");
        hostRef.current.appendChild(mount);

        playerRef.current = new YT.Player(mount, {
          videoId,
          playerVars: {
            autoplay: 1,
            mute: 1, // muted autoplay is allowed; audio comes from Howler
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: e => {
              e.target.mute();
              if (isPlayingRef.current) e.target.playVideo();
              else e.target.pauseVideo();
            },
            onStateChange: e => {
              // Fade in once frames exist (playing, or paused on a frame).
              if (e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.PAUSED) {
                setVisible(true);
              }
              // Manual loop (the `loop` param needs a playlist and is flaky).
              if (e.data === YT.PlayerState.ENDED) {
                e.target.seekTo(0, true);
                e.target.playVideo();
              }
            },
            // Invalid id, removed video, or embedding disabled (2, 5, 100, 101, 150).
            onError: e => {
              e.target.pauseVideo?.();
              setVisible(false);
              setFailedId(currentVideoIdRef.current);
            },
          },
        });
      })
      .catch(() => {
        // IFrame script blocked or offline.
        if (!cancelled) setFailedId(videoId);
      });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Follow the audio's play/pause (YouTube). Keep it parked while the
  // fallback is showing.
  useEffect(() => {
    const p = playerRef.current;
    if (!p || typeof p.playVideo !== "function") return;
    if (useFallback || !isPlaying) p.pauseVideo();
    else p.playVideo();
  }, [isPlaying, useFallback]);

  // Tear the player down on unmount.
  useEffect(() => {
    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, []);

  const showYouTube = visible && !useFallback;
  const showFallback = useFallback && fallbackLoaded;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-white dark:bg-neutral-900">
      {/* YouTube: 16:9 box scaled to always cover the viewport, centred. */}
      <div
        ref={hostRef}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          transition-opacity duration-1000 [&_iframe]:h-full [&_iframe]:w-full
          ${showYouTube ? "opacity-40 dark:opacity-30" : "opacity-0"}`}
        style={{ width: "max(100vw, 177.78vh)", height: "max(100vh, 56.25vw)" }}
      />

      {/* Fallback: only mounted when needed, so it isn't downloaded otherwise. */}
      {useFallback && (
        <video
          ref={fallbackRef}
          src={FALLBACK_VIDEO_URL!}
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setFallbackLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000
            ${showFallback ? "opacity-40 dark:opacity-30" : "opacity-0"}`}
        />
      )}

      {/* Scrim keeps text readable over bright frames. */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/40 to-white/80 dark:from-black/70 dark:via-black/40 dark:to-black/80" />
    </div>
  );
}