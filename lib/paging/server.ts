// lib/paging/server.ts
//
// Server-side helpers for paginated API routes. Pagination is OPT-IN: a
// request with neither ?page nor ?pageSize gets `null` back from
// parsePaging, and the route keeps returning its old plain array. That way
// existing callers (fetchSongs, fetchPlaylists, the search page…) keep
// working untouched while new code asks for pages.

import type { Paged } from "./types";

export interface PagingParams {
  page: number;
  pageSize: number;
  q: string;
  sort: string; // always one of the whitelisted keys
}

const MAX_PAGE = 10_000;

function toPositiveInt(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parsePaging(
  params: URLSearchParams,
  opts: { sorts: readonly string[]; defaultPageSize?: number; maxPageSize?: number }
): PagingParams | null {
  if (!params.has("page") && !params.has("pageSize")) return null;

  const { sorts, defaultPageSize = 24, maxPageSize = 60 } = opts;
  const sortParam = params.get("sort") ?? "";

  return {
    page: Math.min(toPositiveInt(params.get("page"), 1), MAX_PAGE),
    pageSize: Math.min(toPositiveInt(params.get("pageSize"), defaultPageSize), maxPageSize),
    q: (params.get("q") ?? "").trim().slice(0, 100),
    sort: sorts.includes(sortParam) ? sortParam : sorts[0],
  };
}

// Escapes user input before it goes into a MongoDB $regex, so "c++" or
// "(loop)" search literally instead of throwing as an invalid regex.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function pageResponse<T>(
  items: T[],
  total: number,
  { page, pageSize }: { page: number; pageSize: number }
): Paged<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// Case-insensitive collation so "apple" and "Banana" sort naturally for
// title/artist sorts instead of all capitals first.
export const CI_COLLATION = { locale: "en", strength: 2 } as const;
