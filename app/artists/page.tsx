"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconMicrophone2 } from "@tabler/icons-react";
import ArtistCard, { ArtistSummary } from "@/components/artists/ArtistCard";
import PagedListShell from "@/components/basics/PagedListShell";
import { fetchArtistsPage } from "@/lib/TanStackQuery/Queries/fetchArtistsPage";
import { usePagedUrlState } from "@/lib/paging/usePagedUrlState";
import type { Paged } from "@/lib/paging/types";

// 24 divides evenly into 2, 3 and 4 columns, so the last row is never ragged.
const PAGE_SIZE = 24;
const SORTS = [
  { value: "popular", label: "Most followed" },
  { value: "name", label: "A–Z" },
];

function ArtistsList() {
  const paging = usePagedUrlState({ basePath: "/artists", sorts: SORTS.map(s => s.value) });
  const { q, page, sort } = paging;

  const { data, isLoading, isError } = useQuery<Paged<ArtistSummary>, Error>({
    queryKey: ["artists-page", q, sort, page, PAGE_SIZE],
    queryFn: () => fetchArtistsPage<ArtistSummary>({ q, page, pageSize: PAGE_SIZE, sort }),
    staleTime: 1000 * 60,
  });

  return (
    <PagedListShell
      eyebrow="People"
      title="Artists"
      noun={["artist", "artists"]}
      searchPlaceholder="Search artists…"
      paging={paging}
      sorts={SORTS}
      data={data}
      isLoading={isLoading}
      isError={isError}
      emptyIcon={<IconMicrophone2 className="w-7 h-7 text-neutral-400 dark:text-neutral-700" />}
      emptyText="No artists yet — they're extracted automatically from public tracks during the weekly sync."
      gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      skeletonClassName="aspect-[3/4] rounded-2xl"
    >
      {data?.items.map(artist => (
        <ArtistCard key={artist.slug} artist={artist} />
      ))}
    </PagedListShell>
  );
}

export default function ArtistsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-neutral-500">Loading…</div>}>
      <ArtistsList />
    </Suspense>
  );
}
