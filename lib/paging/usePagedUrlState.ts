"use client";

// lib/paging/usePagedUrlState.ts
//
// Keeps a list page's search text, sort and page number in the URL, so a
// page is shareable/bookmarkable and the browser back button walks through
// pages. Typing is debounced into the URL; changing the query or sort
// resets to page 1.
//
// Components using this must be rendered under <Suspense> (it calls
// useSearchParams), same as the existing /search page.

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Options {
  basePath: string; // e.g. "/trending"
  sorts?: readonly string[]; // first entry is the default
  debounceMs?: number;
}

type Next = Partial<{ q: string; page: number; sort: string }>;

export function usePagedUrlState({ basePath, sorts = [], debounceMs = 300 }: Options) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "", 10) || 1);
  const defaultSort = sorts[0] ?? "";
  const sortParam = searchParams.get("sort") ?? "";
  const sort = sorts.includes(sortParam) ? sortParam : defaultSort;

  const [input, setInput] = useState(q);

  const go = (next: Next, mode: "push" | "replace") => {
    const nextQ = next.q ?? q;
    const nextPage = next.page ?? page;
    const nextSort = next.sort ?? sort;

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextSort && nextSort !== defaultSort) params.set("sort", nextSort);
    if (nextPage > 1) params.set("page", String(nextPage));

    const qs = params.toString();
    router[mode](qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  // Always-current references, so the debounce timer never acts on a stale render.
  const goRef = useRef(go);
  goRef.current = go;
  const qRef = useRef(q);
  qRef.current = q;
  const lastPushedQ = useRef(q);

  // Debounced typing -> URL.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = input.trim();
      if (next !== qRef.current) {
        lastPushedQ.current = next;
        goRef.current({ q: next, page: 1 }, "replace");
      }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [input, debounceMs]);

  // URL -> input, but ONLY for changes we didn't make ourselves (back/forward
  // button). Otherwise our own URL update would overwrite what the user is
  // still typing.
  useEffect(() => {
    if (q !== lastPushedQ.current) {
      lastPushedQ.current = q;
      setInput(q);
    }
  }, [q]);

  return {
    q,
    page,
    sort,
    input,
    setInput,
    setPage: (p: number) => go({ page: p }, "push"),
    replacePage: (p: number) => go({ page: p }, "replace"),
    setSort: (s: string) => go({ sort: s, page: 1 }, "push"),
    clearSearch: () => {
      setInput("");
      lastPushedQ.current = "";
      go({ q: "", page: 1 }, "replace");
    },
  };
}

export type PagedUrlState = ReturnType<typeof usePagedUrlState>;
