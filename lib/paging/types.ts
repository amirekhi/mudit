// lib/paging/types.ts
//
// The one response shape every paginated endpoint returns, so every list
// page can render counts and page numbers the same way.

export interface Paged<T> {
  items: T[];
  total: number; // matches across ALL pages
  page: number; // 1-based
  pageSize: number;
  pageCount: number; // always >= 1
}
