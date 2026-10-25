"use client";

import ScrollRow from "./ScrollRow";
import TastePlaylistCard from "./TastePlaylistCard";
import type { MadeForYouPlaylist } from "@/lib/TanStackQuery/Queries/forYou";

/** Playlists generated from the user's tastes: the daily, weekly, monthly and on-demand mixes. */
export default function MadeForYouCarousel({ playlists }: { playlists: MadeForYouPlaylist[] }) {
  if (playlists.length === 0) return null;
  return (
    <ScrollRow eyebrow="Yours" title="Made for you" accent="yours" seeAllHref="/tastes" itemCount={playlists.length}>
      {playlists.map(p => (
        <TastePlaylistCard key={p._id} playlist={p} />
      ))}
    </ScrollRow>
  );
}