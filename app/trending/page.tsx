"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconMusic } from "@tabler/icons-react";
import PagedListShell from "@/components/basics/PagedListShell";
import PublicMusicCard from "@/components/PlayList/PublicMusicCard";
import { fetchPublicTracksPage } from "@/lib/TanStackQuery/Queries/fetchPublicTracksPage";
import { usePagedUrlState } from "@/lib/paging/usePagedUrlState";
import type { Paged } from "@/lib/paging/types";
import { Track } from "@/store/useAudioStore";

// 24 divides evenly into 2, 3 and 4 columns, so the last row is never ragged.
const PAGE_SIZE = 24;
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title" },
  { value: "artist", label: "Artist" },
];

function TrendingList() {
  const paging = usePagedUrlState({ basePath: "/trending", sorts: SORTS.map(s => s.value) });
  const { q, page, sort } = paging;

  const { data, isLoading, isError } = useQuery<Paged<Track>, Error>({
    queryKey: ["public-tracks-page", q, sort, page, PAGE_SIZE],
    queryFn: () => fetchPublicTracksPage({ q, page, pageSize: PAGE_SIZE, sort }),
    staleTime: 1000 * 60,
  });

  return (
    <PagedListShell
      eyebrow="Charts"
      title="Trending"
      noun={["track", "tracks"]}
      searchPlaceholder="Search public tracks…"
      paging={paging}
      sorts={SORTS}
      data={data}
      isLoading={isLoading}
      isError={isError}
      emptyIcon={<IconMusic className="w-7 h-7 text-neutral-400 dark:text-neutral-700" />}
      emptyText="No public tracks yet"
      gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      skeletonClassName="aspect-square rounded-xl"
    >
      {data?.items.map(track => (
        <PublicMusicCard key={track._id} track={track} fluid />
      ))}
    </PagedListShell>
  );
}

export default function TrendingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-neutral-500">Loading…</div>}>
      <TrendingList />
    </Suspense>
  );
}