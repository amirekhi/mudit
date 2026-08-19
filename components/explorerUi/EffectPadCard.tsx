"use client";

import { useMemo } from "react";
import { Track, useAudioStore } from "@/store/useAudioStore";
import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";

interface Props {
  track: Track;
  index: number; // position in the row — used for the pad label (A1, A2…), mirroring real sampler pad banks
}

// Deterministic pseudo-random bar heights, seeded from the track id. Same
// track always renders the same "waveform" — it's not real audio analysis,
// just a stable per-track visual fingerprint so pads don't all look identical.
function seededBars(id: string, count = 9): number[] {
  let seed = 0;
  for (let i = 0; i < id.length; i++) {
    seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    bars.push(22 + (seed % 78)); // height as a % between 22–100
  }
  return bars;
}

// Converts a 0-based index into sampler-style pad labels: A1, A2 … A8, B1…
// A real, if playful, nod to hardware sampler pad banks — not decoration.
function padLabel(index: number): string {
  const bank = String.fromCharCode(65 + Math.floor(index / 8)); // A, B, C…
  const slot = (index % 8) + 1;
  return `${bank}${slot}`;
}

export default function EffectPadCard({ track, index }: Props) {
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isActive = currentTrack?._id === track._id;
  const isLive = isActive && isPlaying;

  const bars = useMemo(() => seededBars(track._id), [track._id]);

  const handleClick = () => {
    if (isActive) togglePlay();
    else playTrack(track);
  };

  return (
    <button
      onClick={handleClick}
      aria-pressed={isLive}
      aria-label={`${isLive ? "Pause" : "Play"} ${track.title}`}
      className={`group relative flex-shrink-0 w-32 h-32 max-md:w-24 max-md:h-24 rounded-2xl
        bg-neutral-950 border overflow-hidden text-left transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
        active:scale-[0.96]
        ${isLive
          ? "border-amber-400/70 shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_0_24px_-4px_rgba(251,191,36,0.5)]"
          : "border-white/10 hover:border-amber-400/40 shadow-md hover:shadow-lg"
        }`}
    >
      {/* Pad label — top-left, sampler-bank style */}
      <span className="absolute top-2 left-2.5 z-10 font-mono text-[10px] tracking-wider text-amber-400/80">
        {padLabel(index)}
      </span>

      {/* FX chip — top-right, identifies this as an effect vs. a track at a glance */}
      <span className="absolute top-2 right-2.5 z-10 font-mono text-[9px] tracking-widest text-white/30">
        FX
      </span>

      {/* Primary visual: the mp3's own embedded artwork when it has one —
          shown clearly, not just as a dim backdrop, so effects with real
          artwork actually look like their source file. Generated waveform
          bars are the fallback for the common case of no embedded image,
          not a permanent overlay on top of real art. */}
      {track.image ? (
        <img
          src={track.image}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100
            transition-opacity"
        />
      ) : (
        <div className="absolute inset-0 flex items-end justify-center gap-[3px] px-4 pb-8">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`w-full rounded-full bg-gradient-to-t from-amber-500/90 to-amber-300/60
                ${isLive ? "motion-safe:animate-pulse" : ""}`}
              style={{
                height: `${h}%`,
                animationDelay: isLive ? `${i * 90}ms` : undefined,
                animationDuration: isLive ? "700ms" : undefined,
              }}
            />
          ))}
        </div>
      )}

      {/* Subtle dark wash over real artwork so the pad label/FX chip/footer
          text stay legible regardless of how bright the source image is —
          skipped for the bars fallback, which is already dark enough. */}
      {track.image && (
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
      )}

      {/* Center play/pause affordance — dim by default, solid once this pad is live */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity
          ${isLive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
          {isLive ? (
            <IconPlayerPause className="w-4 h-4 text-amber-300" />
          ) : (
            <IconPlayerPlay className="w-4 h-4 text-amber-300" />
          )}
        </div>
      </div>

      {/* Label footer — solid strip so text stays legible over the bars regardless of artwork */}
      <div className="absolute bottom-0 inset-x-0 px-2.5 py-1.5 bg-gradient-to-t from-black/90 to-transparent">
        <p className="text-[11px] font-medium text-white truncate leading-tight">{track.title}</p>
      </div>
    </button>
  );
}