"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconSparkles, IconX } from "@tabler/icons-react";
import { Spinner } from "@/components/basics/Spinner";
import { PERIODS } from "@/lib/recs/periods";
import { useTastes } from "@/lib/TanStackQuery/Queries/tastes";
import { useQuickMix } from "./useQuickMix";

/**
 * The "Mix" shortcut next to New and Edit. Pick a taste and today, this week
 * or this month: it builds that mix and takes you straight to the playlist.
 */
export default function QuickMixMenu({ buttonClassName }: { buttonClassName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: tastes = [], isLoading } = useTastes({ enabled: open });
  const { run, pending, error, clearError } = useQuickMix(() => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    clearError();
    setOpen(o => !o);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} className={buttonClassName}>
        <IconSparkles className="w-4 h-4" /> Mix
      </button>

      {open && (
        <>
          {/* On phones the menu is a sheet at the bottom; on desktop it drops down. */}
          <div className="md:hidden fixed inset-0 z-[55] bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Quick mix"
            className="fixed inset-x-3 bottom-4 z-[60] md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-96
              rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Quick mix</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Pick a taste and a time. We&apos;ll open the playlist.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="md:hidden p-1.5 -mr-1 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center text-sm text-neutral-500">
                <Spinner size={14} /> Loading your tastes…
              </div>
            ) : tastes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 text-center space-y-3">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">You don&apos;t have a taste yet.</p>
                <Link
                  href="/tastes?new=1"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 transition"
                >
                  <IconSparkles className="w-4 h-4" /> Create one
                </Link>
              </div>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tastes.map(t => (
                  <li key={t._id} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 p-3">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate mb-2">{t.name}</p>
                    <div className="flex gap-2">
                      {PERIODS.map(p => {
                        const busy = pending?.tasteId === t._id && pending.period === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={!!pending}
                            onClick={() => run(t._id, p.id)}
                            title={p.mixName}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition
                              bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200
                              hover:bg-indigo-600 hover:border-indigo-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {busy && <Spinner size={12} />}
                            {p.button}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

            {tastes.length > 0 && (
              <Link
                href="/tastes"
                onClick={() => setOpen(false)}
                className="mt-3 block text-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Manage tastes
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}