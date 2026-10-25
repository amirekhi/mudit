"use client";

import ScrollRow from "./ScrollRow";
import TrackTile from "./TrackTile";
import type { HomeTrack } from "@/lib/TanStackQuery/Queries/forYou";

/** What the user listened to lately, newest first. Built from their listening history. */
export default function RecentlyPlayedCarousel({ tracks }: { tracks: HomeTrack[] }) {
  if (tracks.length === 0) return null;
  return (
    <ScrollRow eyebrow="Yours" title="Recently played" accent="yours" itemCount={tracks.length} gapClassName="gap-4">
      {tracks.map(t => (
        <TrackTile key={t._id} track={t} />
      ))}
    </ScrollRow>
  );
}