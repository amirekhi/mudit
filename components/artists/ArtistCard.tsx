"use client";

import Link from "next/link";

export interface ArtistSummary {
  _id: string;
  name: string;
  slug: string;
  image: string | null;
  fanCount: number;
}

export default function ArtistCard({ artist }: { artist: ArtistSummary }) {
  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800
        transition-colors"
    >
      <div className="w-28 h-28 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
        {artist.image ? (
          <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-2xl font-semibold">
            {artist.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate max-w-[9rem]">
          {artist.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {artist.fanCount.toLocaleString()} fans
        </p>
      </div>
    </Link>
  );
}