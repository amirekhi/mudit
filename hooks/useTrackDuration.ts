import { useEffect, useState } from "react";
import type { Howl } from "howler";
import { useAudioStore } from "@/store/useAudioStore";

/**
 * Length in seconds of the audio that's currently loaded.
 *   null = not known yet (still loading)
 *   0    = gave up waiting (slow connection); treat as unknown
 * The value is tied to the specific Howl instance, so it can never carry
 * over from the previous track for even one render.
 */
export function useTrackDuration(): number | null {
  const howl = useAudioStore(s => s.howl);
  const [state, setState] = useState<{ howl: Howl; duration: number } | null>(null);

  useEffect(() => {
    if (!howl) return;

    const read = () => setState({ howl, duration: Math.round(howl.duration()) || 0 });

    if (howl.state() === "loaded") {
      read();
      return;
    }

    howl.once("load", read);
    const giveUp = setTimeout(
      () => setState(s => (s?.howl === howl ? s : { howl, duration: 0 })),
      4000
    );

    return () => {
      clearTimeout(giveUp);
      howl.off("load", read);
    };
  }, [howl]);

  return howl && state?.howl === howl ? state.duration : null;
}