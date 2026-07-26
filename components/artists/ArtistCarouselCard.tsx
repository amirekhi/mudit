"use client";

import Link from "next/link";

export interface ArtistSummary {
  _id: string;
  name: string;
  slug: string;
  image: string | null;
  fanCount: number;
}

export default function ArtistCarouselCard({ artist }: { artist: ArtistSummary }) {
  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group flex-shrink-0 w-28 max-md:w-24 flex flex-col items-center gap-2"
    >
      <div
        className="w-24 h-24 max-md:w-20 max-md:h-20 rounded-full overflow-hidden
          bg-neutral-200 dark:bg-neutral-700 ring-1 ring-neutral-200 dark:ring-neutral-700
          group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
      >
        {artist.image ? (
          <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xl font-semibold">
            {artist.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-neutral-900 dark:text-white text-center truncate w-full">
        {artist.name}
      </p>
    </Link>
  );
}