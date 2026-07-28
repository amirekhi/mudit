"use client";

import { useEffect, useRef, useState } from "react";
import { IconVolume2, IconVolumeOff, IconVolume } from "@tabler/icons-react";
import SectionHeader from "@/components/basics/SectionHeader";

export interface MusicVideo {
  _id: string;
  title: string;
  artist: string;
  src: string;     // mp4 url
  poster?: string;
}

// TODO: replace with a real fetch, e.g.
// const { data: videos = [] } = useQuery(["music-videos"], fetchMusicVideos);
const dummyVideos: MusicVideo[] = [
  { _id: "v1", title: "Neon Nights", artist: "Aria Sol", src: "/videos/video1.mp4", poster: "/test.jpg" },
  { _id: "v2", title: "Golden Hour", artist: "Marlow", src: "/videos/video2.mp4", poster: "/test.jpg" },
  { _id: "v3", title: "Static Bloom", artist: "Kessler", src: "/videos/video3.mp4", poster: "/test.jpg" },
  { _id: "v4", title: "Low Tide", artist: "Reyes", src: "/videos/video4.mp4", poster: "/test.jpg" },
];

interface Props {
  title?: string;
  videos?: MusicVideo[];
}

export default function MusicVideoCarousel({ title = "Music Videos", videos = dummyVideos }: Props) {
  const [active, setActive] = useState(0);

  // Current volume per video (0–1). Starts muted (0) so autoplay isn't blocked.
  const [volumeMap, setVolumeMap] = useState<Record<string, number>>(
    () => Object.fromEntries(videos.map(v => [v._id, 0]))
  );
  // Remembers the last non-zero volume so the mute button can "unmute" back to it.
  const lastVolumeRef = useRef<Record<string, number>>(
    Object.fromEntries(videos.map(v => [v._id, 0.7]))
  );

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Play the active video, pause the rest — runs whenever the active index changes
  useEffect(() => {
    videos.forEach((v, i) => {
      const el = videoRefs.current[v._id];
      if (!el) return;
      if (i === active) {
        el.currentTime = 0;
        el.play().catch(() => {}); // autoplay can be blocked before user interaction; safe to ignore
      } else {
        el.pause();
      }
    });
  }, [active, videos]);

  // Keep each <video>'s actual volume in sync with state
  useEffect(() => {
    videos.forEach(v => {
      const el = videoRefs.current[v._id];
      if (el) el.volume = volumeMap[v._id];
    });
  }, [volumeMap, videos]);

  const setVolume = (id: string, value: number) => {
    setVolumeMap(prev => ({ ...prev, [id]: value }));
    if (value > 0) lastVolumeRef.current[id] = value;
  };

  const toggleMute = (id: string) => {
    const current = volumeMap[id];
    if (current > 0) {
      lastVolumeRef.current[id] = current;
      setVolumeMap(prev => ({ ...prev, [id]: 0 }));
    } else {
      setVolumeMap(prev => ({ ...prev, [id]: lastVolumeRef.current[id] || 0.7 }));
    }
  };

  const VolumeIcon = (vol: number) =>
    vol === 0 ? IconVolumeOff : vol < 0.5 ? IconVolume : IconVolume2;

  if (videos.length === 0) return null;

  return (
    <div className="relative w-full">
      <SectionHeader eyebrow="Watch" title={title} accent="discover" />

      <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-xl bg-black">
        {videos.map((v, i) => {
          const vol = volumeMap[v._id];
          const Icon = VolumeIcon(vol);

          return (
            <div
              key={v._id}
              className="absolute inset-0 transition-all duration-700 ease-out"
              style={{
                transform: `translateX(${(i - active) * 100}%)`,
                opacity: i === active ? 1 : 0,
              }}
            >
              <video
                ref={el => { videoRefs.current[v._id] = el; }}
                src={v.src}
                poster={v.poster}
                loop
                playsInline
                className="w-full h-full object-cover"
                onEnded={() => setActive(prev => (prev + 1) % videos.length)}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{v.title}</p>
                  <p className="text-white/70 text-xs truncate">{v.artist}</p>
                </div>

                {/* Volume control — icon + slider, in a pill */}
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-3 py-2 flex-shrink-0">
                  <button onClick={() => toggleMute(v._id)} aria-label="Toggle mute">
                    <Icon className="w-4 h-4 text-white" />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={vol}
                    onChange={e => setVolume(v._id, parseFloat(e.target.value))}
                    className="w-16 md:w-20 accent-indigo-500 cursor-pointer"
                    aria-label={`Volume for ${v.title}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bullet indicators */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {videos.map((v, i) => (
          <button
            key={v._id}
            onClick={() => setActive(i)}
            aria-label={`Show ${v.title}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active
                ? "w-6 bg-indigo-500"
                : "w-2 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600"
            }`}
          />
        ))}
      </div>ss
    </div>
  );
}