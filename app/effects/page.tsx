"use client";

import { Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconBolt } from "@tabler/icons-react";
import {
  fetchTelegramEffectsPage,
  telegramResultToTrack,
  TelegramEffectsPage,
} from "@/lib/TanStackQuery/Queries/fetchTelegramEffects";
import PagedListShell from "@/components/basics/PagedListShell";
import SearchMusicCard from "@/components/basics/SearchMusicCard";
import { usePagedUrlState } from "@/lib/paging/usePagedUrlState";

// 24 divides evenly into 2, 3, 4 and 6 columns, so the last row is never ragged.
const PAGE_SIZE = 24;

function EffectsList() {
  const paging = usePagedUrlState({ basePath: "/effects" });
  const { q, page } = paging;

  const { data, isLoading, isError } = useQuery<TelegramEffectsPage, Error>({
    queryKey: ["telegram-effects-page", q, page, PAGE_SIZE],
    queryFn: () => fetchTelegramEffectsPage({ q, page, pageSize: PAGE_SIZE }),
    staleTime: 1000 * 60, // new uploads can land any time, so keep this short
  });

  const tracks = useMemo(() => (data?.items ?? []).map(telegramResultToTrack), [data]);

  return (
    <PagedListShell
      eyebrow={<><IconBolt className="w-3.5 h-3.5" />Soundboard</>}
      title="Effects"
      noun={["effect", "effects"]}
      searchPlaceholder="Search effects…"
      paging={paging}
      data={data}
      isLoading={isLoading}
      isError={isError}
      emptyIcon={<IconBolt className="w-7 h-7 text-neutral-400 dark:text-neutral-700" />}
      emptyText="No effects yet"
      gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4"
      skeletonClassName="aspect-square rounded-xl"
      maxWidthClassName="max-w-6xl"
    >
      {tracks.map(track => (
        <SearchMusicCard key={track._id} track={track} />
      ))}
    </PagedListShell>
  );
}

export default function EffectsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-neutral-500">Loading…</div>}>
      <EffectsList />
    </Suspense>
  );
}
