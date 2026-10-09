"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface Props {
  page: number; // 1-based
  pageCount: number;
  onChange: (page: number) => void;
}

// 1 … 4 5 6 … 20 — always shows first, last and the current page's neighbours.
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const wanted = Array.from(new Set([1, pageCount, page - 1, page, page + 1]))
    .filter(p => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  wanted.forEach((p, i) => {
    if (i > 0 && p - wanted[i - 1] > 1) items.push("gap");
    items.push(p);
  });
  return items;
}

const base =
  "h-9 min-w-9 px-3 inline-flex items-center justify-center rounded-full text-xs font-medium transition-colors";
const idle =
  "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 " +
  "hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white";

export default function Pagination({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={`${base} ${idle} disabled:opacity-30 disabled:pointer-events-none`}
      >
        <IconChevronLeft className="w-4 h-4" />
      </button>

      {pageItems(page, pageCount).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-neutral-400 dark:text-neutral-600 text-xs select-none">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={`${base} ${item === page ? "bg-indigo-600 text-white" : idle}`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className={`${base} ${idle} disabled:opacity-30 disabled:pointer-events-none`}
      >
        <IconChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
