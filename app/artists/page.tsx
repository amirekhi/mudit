"use client";

import { useQuery } from "@tanstack/react-query";
import ArtistCard, { ArtistSummary } from "@/components/artists/ArtistCard";
import ThemeToggle from "@/components/basics/ThemeToggle";
import BackButton from "@/components/basics/BackButton";

export default function ArtistsPage() {
  const { data: artists = [], isLoading } = useQuery<ArtistSummary[]>({
    queryKey: ["artists"],
    queryFn: async () => {
      const res = await fetch("/api/artists");
      if (!res.ok) throw new Error("Failed to fetch artists");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 px-6 transition-colors">
      <div className="max-w-5xl mx-auto w-full my-12">
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Artists</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {artists.length} artist{artists.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        {isLoading ? (
          <div className="text-neutral-500 text-center py-24">Loading…</div>
        ) : artists.length === 0 ? (
          <div className="text-center py-24 text-neutral-500">
            No artists yet — they're extracted automatically from public tracks
            during the weekly sync.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {artists.map(artist => (
              <ArtistCard key={artist.slug} artist={artist} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}