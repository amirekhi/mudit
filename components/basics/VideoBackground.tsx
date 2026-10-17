/// <reference types="youtube" />
"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioStore } from "@/store/useAudioStore";
import { useTrackVideo } from "@/hooks/useTrackVideo";
import { useTrackDuration } from "@/hooks/useTrackDuration";

// Shown when YouTube has nothing usable for the current track (no good match,
// API/quota error, embedding blocked, player error, or the IFrame script
// failing to load). Set to null to disable the fallback.
const FALLBACK_VIDEO_URL: string | null = "/videos/video1.mp4";

// The player is rendered small and scaled up with CSS. YouTube picks the
// stream quality from the player's size, so this keeps it near 360p instead
// of streaming 1080p for a dimmed background.
const PLAYER_W = 640;
const PLAYER_H = 360;

// ── Sync tuning ──
// Only sync when the video and the audio differ in length by at most this
// many seconds (otherwise it's a different cut and times won't line up).
const SYNC_TOLERANCE_S = 3;
const SYNC_INTERVAL_MS = 1000;
// Re-seek the video when it drifts further than this from the audio.
const DRIFT_THRESHOLD_S = 0.4;
// Don't seek again right after a seek (the player is still buffering).
const SEEK_COOLDOWN_MS = 3000;
// Constant video-minus-audio offset in seconds (e.g. 2 if the video has a
// 2 s intro the audio lacks). A per-track value would live on the Track.
const VIDEO_OFFSET_S = 0;

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
 * Audio still comes from Howler; the video follows its play/pause and, when
 * the video is the same recording, its position.
 * Mount once, inside the QueryClientProvider (e.g. in your root layout).
 */
export default function VideoBackground() {
  const track = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);

  // Respect reduced-motion and data-saver: no lookup, no video, no fallback.
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || nav.connection?.saveData) setAllowed(false);
  }, []);
  const activeTrack = allowed ? track : null;

  const trackDuration = useTrackDuration();
  const { data, isPending } = useTrackVideo(activeTrack, trackDuration);
  const videoId = data?.videoId ?? null;
  const videoDuration = data?.duration ?? 0;

  // Same recording? Then we can keep the video's position locked to the audio.
  const syncable =
    !!trackDuration && videoDuration > 0 && Math.abs(videoDuration - trackDuration) <= SYNC_TOLERANCE_S;

  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const currentVideoIdRef = useRef<string | null>(null);
  const lastSeekRef = useRef(0);
  const [visible, setVisible] = useState(false);

  // The video id YouTube refused to play (embedding blocked, removed, etc.)
  const [failedId, setFailedId] = useState<string | null>(null);

  // Fallback is used once the lookup has finished and came up empty, or the
  // video it found turned out to be unplayable. While the lookup is still in
  // flight nothing is shown, so there's no flash of the fallback.
  const useFallback =
    !!FALLBACK_VIDEO_URL &&
    !!activeTrack &&
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

  // ── Scale the small player up to cover the container ──
  useEffect(() => {
    const root = rootRef.current;
    const host = hostRef.current;
    if (!root || !host) return;
    const fit = () => {
      const scale = Math.max(root.clientWidth / PLAYER_W, root.clientHeight / PLAYER_H);
      host.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // ── Fallback video: follow the audio's play/pause ──
  useEffect(() => {
    const el = fallbackRef.current;
    if (!el || !useFallback) return;
    if (isPlaying) el.play().catch(() => {}); // muted, so autoplay is allowed
    else el.pause();
  }, [isPlaying, useFallback, fallbackLoaded]);

  // ── YouTube: create the player once, then swap videos with loadVideoById ──
  useEffect(() => {
    currentVideoIdRef.current = videoId;

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
          width: PLAYER_W,
          height: PLAYER_H,
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

  // ── Keep the video's position locked to the audio's ──
  // Re-seeks only when drift passes the threshold, because every seek makes
  // the player rebuffer for a moment. Expect roughly +/-0.4 s at best.
  useEffect(() => {
    if (!syncable || !isPlaying || useFallback) return;

    const tick = () => {
      const player = playerRef.current;
      const howl = useAudioStore.getState().howl;
      if (!player || !howl || typeof player.getPlayerState !== "function") return;
      if (player.getPlayerState() !== YT.PlayerState.PLAYING) return;
      if (Date.now() - lastSeekRef.current < SEEK_COOLDOWN_MS) return;

      const audioTime = howl.seek();
      if (typeof audioTime !== "number") return;

      const target = audioTime + VIDEO_OFFSET_S;
      if (target < 0 || target >= videoDuration - 0.5) return; // outside the video

      if (Math.abs(player.getCurrentTime() - target) > DRIFT_THRESHOLD_S) {
        lastSeekRef.current = Date.now();
        player.seekTo(target, true);
      }
    };

    tick();
    const id = setInterval(tick, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [syncable, isPlaying, useFallback, videoId, videoDuration]);

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
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-white dark:bg-neutral-900"
    >
      {/* YouTube: small fixed-size player, scaled up to cover (see the fit effect). */}
      <div
        ref={hostRef}
        className={`absolute left-1/2 top-1/2 origin-center transition-opacity duration-1000
          [&_iframe]:h-full [&_iframe]:w-full
          ${showYouTube ? "opacity-40 dark:opacity-30" : "opacity-0"}`}
        style={{ width: PLAYER_W, height: PLAYER_H, transform: "translate(-50%, -50%)" }}
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