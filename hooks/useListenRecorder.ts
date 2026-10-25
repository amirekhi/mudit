import { useEffect } from "react";
import type { Howl } from "howler";
import { useAudioStore } from "@/store/useAudioStore";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";

// Plays shorter than this are ignored: rapid next-clicking and accidental taps
// would otherwise flood the history with noise.
const MIN_REPORT_SECONDS = 2;

interface Session {
  howl: Howl;
  trackId: string;
  startedAt: number;
  playedMs: number;
  lastTick: number | null; // set while audio is actually playing
  duration: number;
  source: { kind: "playlist" | "recommendation" | "other"; refId?: string };
}

// Which playlist (if any) the track is being played from.
function currentSource(): Session["source"] {
  const pl = (usePlaylistStore.getState() as { currentPlaylist?: unknown }).currentPlaylist as
    | string
    | { _id?: string; generated?: unknown }
    | null
    | undefined;
  if (!pl) return { kind: "other" };
  if (typeof pl === "string") return { kind: "playlist", refId: pl };
  return { kind: pl.generated ? "recommendation" : "playlist", ...(pl._id ? { refId: String(pl._id) } : {}) };
}

/**
 * Reports what you listen to, so "recently played" and "haven't heard in a
 * while" can work. Mount it once, anywhere that stays on screen (the player).
 *
 * Each Howl is one listening session. Time is counted only while audio is
 * actually playing, so pausing or seeking doesn't inflate it. The session is
 * reported when the track changes, stops, or the tab closes.
 */
export function useListenRecorder() {
  useEffect(() => {
    let session: Session | null = null;

    const tick = () => {
      if (!session) return;
      const now = Date.now();
      if (session.lastTick !== null) {
        session.playedMs += now - session.lastTick;
        session.lastTick = now;
      }
      const d = session.howl.duration();
      if (d > 0) session.duration = d; // read while loaded; it resets after unload
    };

    const flush = () => {
      if (!session) return;
      tick();
      const s = session;
      session = null;

      const playedSeconds = s.playedMs / 1000;
      if (playedSeconds < MIN_REPORT_SECONDS) return;

      authFetch("/api/listens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true, // lets it finish even if the tab is closing
        body: JSON.stringify({
          trackId: s.trackId,
          playedSeconds: Math.round(playedSeconds * 10) / 10,
          ...(s.duration > 0 ? { durationSeconds: Math.round(s.duration) } : {}),
          source: s.source,
          startedAt: new Date(s.startedAt).toISOString(),
        }),
      }).catch(() => {}); // history is best-effort; never disturb playback
    };

    const begin = () => {
      const { howl, currentTrack, isPlaying } = useAudioStore.getState();
      if (!howl || !currentTrack) return;
      session = {
        howl,
        trackId: currentTrack._id,
        startedAt: Date.now(),
        playedMs: 0,
        lastTick: isPlaying ? Date.now() : null,
        duration: 0,
        source: currentSource(),
      };
    };

    begin(); // the player may already be playing when this mounts

    const unsubscribe = useAudioStore.subscribe((state, prev) => {
      if (state.howl !== prev.howl) {
        flush(); // the previous track is done
        begin();
        return;
      }
      if (state.isPlaying !== prev.isPlaying && session) {
        tick();
        session.lastTick = state.isPlaying ? Date.now() : null;
      }
    });

    const timer = setInterval(tick, 1000);
    window.addEventListener("pagehide", flush);

    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", flush);
      unsubscribe();
      flush();
    };
  }, []);
}