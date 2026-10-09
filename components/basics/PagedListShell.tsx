"use client";

// components/basics/PagedListShell.tsx
//
// The shared frame for the dedicated "see all" pages: header with count,
// search box, optional sort chips, loading/error/empty states, the card grid
// (passed as children) and page numbers. Each page supplies its own data
// query and its own card component, so categories stay separate; only this
// chrome is shared.

import { ReactNode, useEffect, useRef } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import Pagination from "@/components/basics/Pagination";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";
import type { PagedUrlState } from "@/lib/paging/usePagedUrlState";

interface Props {
  eyebrow?: ReactNode;
  title: string;
  /** [singular, plural] — "track" / "tracks" */
  noun: [string, string];
  searchPlaceholder: string;
  paging: PagedUrlState;
  sorts?: { value: string; label: string }[];

  data?: { total: number; pageCount: number };
  isLoading: boolean;
  isError: boolean;

  emptyIcon: ReactNode;
  emptyText: string;

  gridClassName: string;
  skeletonClassName: string; // shape of each loading placeholder
  maxWidthClassName?: string;
  children: ReactNode; // the cards
}

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
    active
      ? "bg-indigo-600 text-white"
      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
  }`;

export default function PagedListShell({
  eyebrow,
  title,
  noun,
  searchPlaceholder,
  paging,
  sorts,
  data,
  isLoading,
  isError,
  emptyIcon,
  emptyText,
  gridClassName,
  skeletonClassName,
  maxWidthClassName = "max-w-5xl",
  children,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const { q, page, sort, input, setInput, setPage, setSort, clearSearch, replacePage } = paging;

  // ?page=99 on a 5-page list — send them to the last real page.
  useEffect(() => {
    if (data && page > data.pageCount) replacePage(data.pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page]);

  const changePage = (next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-white dark:bg-transparent transition-colors">
      <div className={`${maxWidthClassName} mx-auto px-4 md:px-6 py-8 pb-32 flex flex-col gap-6`}>
        <div ref={topRef} />

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            {eyebrow && (
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-medium uppercase tracking-wide mb-1">
                {eyebrow}
              </div>
            )}
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</h1>
            {data && (
              <p className="text-sm text-neutral-500 mt-0.5">
                {data.total} {data.total === 1 ? noun[0] : noun[1]}
                {q && <> matching "{q}"</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800
                text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2
                focus:ring-indigo-500 transition"
            />
            {input && (
              <button
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <IconX className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              </button>
            )}
          </div>

          {sorts && sorts.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Sort</span>
              {sorts.map(s => (
                <button key={s.value} onClick={() => setSort(s.value)} className={chip(sort === s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className={gridClassName} aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className={`bg-neutral-200 dark:bg-white/10 motion-safe:animate-pulse ${skeletonClassName}`} />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16 text-neutral-500 text-sm">
            Couldn't load this list. Try again in a moment.
          </div>
        )}

        {/* Empty */}
        {data && data.total === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
              {emptyIcon}
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 font-medium">
              {q ? `Nothing matched "${q}"` : emptyText}
            </p>
            {q && <p className="text-neutral-400 dark:text-neutral-600 text-sm">Try a different search</p>}
          </div>
        )}

        {/* Grid */}
        {data && data.total > 0 && <div className={gridClassName}>{children}</div>}

        {data && <Pagination page={page} pageCount={data.pageCount} onChange={changePage} />}
      </div>
    </div>
  );
}
