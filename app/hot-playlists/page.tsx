"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconPlaylist } from "@tabler/icons-react";
import PagedListShell from "@/components/basics/PagedListShell";
import PublicPlaylistCard from "@/components/PlayList/PublicPlaylistCard";
import { Playlist } from "@/components/PlayList/PlaylistCard";
import { fetchPublicPlaylistsPage } from "@/lib/TanStackQuery/Queries/fetchPublicPlaylistsPage";
import { usePagedUrlState } from "@/lib/paging/usePagedUrlState";
import type { Paged } from "@/lib/paging/types";

// 24 divides evenly into 2, 3 and 4 columns, so the last row is never ragged.
const PAGE_SIZE = 24;
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title" },
];

function HotPlaylistsList() {
  const paging = usePagedUrlState({ basePath: "/hot-playlists", sorts: SORTS.map(s => s.value) });
  const { q, page, sort } = paging;

  const { data, isLoading, isError } = useQuery<Paged<Playlist>, Error>({
    queryKey: ["public-playlists-page", q, sort, page, PAGE_SIZE],
    queryFn: () => fetchPublicPlaylistsPage({ q, page, pageSize: PAGE_SIZE, sort }),
    staleTime: 1000 * 60,
  });

  return (
    <PagedListShell
      eyebrow="Discover"
      title="Hot Playlists"
      noun={["playlist", "playlists"]}
      searchPlaceholder="Search public playlists…"
      paging={paging}
      sorts={SORTS}
      data={data}
      isLoading={isLoading}
      isError={isError}
      emptyIcon={<IconPlaylist className="w-7 h-7 text-neutral-400 dark:text-neutral-700" />}
      emptyText="No public playlists yet"
      gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      skeletonClassName="aspect-[4/3] rounded-2xl"
    >
      {data?.items.map(playlist => (
        <PublicPlaylistCard key={playlist._id} playlist={playlist} />
      ))}
    </PagedListShell>
  );
}

export default function HotPlaylistsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-neutral-500">Loading…</div>}>
      <HotPlaylistsList />
    </Suspense>
  );
}
