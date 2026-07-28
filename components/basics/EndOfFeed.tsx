"use client";

const BAR_COUNT = 48;

// A hand-shaped amplitude envelope — rises through the middle and tapers to
// near-silence at both ends, like a waveform fading out. This exact shape is
// the intended design, not per-render randomness, so it looks composed
// rather than jittery on every reload.
const heights = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1);
  const envelope = Math.sin(t * Math.PI); // rises 0 -> 1 -> falls to 0
  const wobble = Math.sin(i * 1.7) * 0.15; // slight irregularity so it reads as a real waveform, not a perfect dome
  return Math.max(0.06, envelope + wobble);
});

export default function EndOfFeed() {
  return (
    <div className="w-full flex flex-col items-center gap-4 pt-16 pb-12 select-none">
      <div className="flex items-end gap-[3px] h-16 motion-safe:animate-[pulse_6s_ease-in-out_infinite]">
        {heights.map((h, i) => (
          <div
            key={i}
            style={{ height: `${h * 100}%` }}
            className="w-[3px] rounded-full bg-gradient-to-t from-indigo-400/70 to-amber-400/70
              dark:from-indigo-500/50 dark:to-amber-400/50"
          />
        ))}
      </div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-600 italic">
        the mix fades out here
      </p>
    </div>
  );
}