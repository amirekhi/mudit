"use client";

import Link from "next/link";
import { IconSparkles } from "@tabler/icons-react";
import { Spinner } from "@/components/basics/Spinner";
import { PERIODS } from "@/lib/recs/periods";
import { useTastes } from "@/lib/TanStackQuery/Queries/tastes";
import { useQuickMix } from "./useQuickMix";

/**
 * Takes the place of "Made for you" until there's something to show:
 * no taste yet -> invite them to make one; a taste but no mix -> one tap to make the first.
 */
export default function TasteNudge() {
  const { data: tastes = [], isLoading } = useTastes();
  const { run, pending, error } = useQuickMix();
  const first = tastes[0];

  if (isLoading) return null;

  return (
    <div className="mx-0 md:mx-2 rounded-2xl border border-indigo-300/40 dark:border-indigo-500/30 bg-white/80 dark:bg-neutral-900/60 backdrop-blur p-5 md:p-6
      flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
      <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
        <IconSparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>

      {!first ? (
        <>
          <div className="flex-1">
            <p className="text-base font-semibold text-neutral-900 dark:text-white">Music that fits your mood</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Pick the moods you&apos;re into and get a daily, weekly or monthly mix made for you.
            </p>
          </div>
          <Link
            href="/tastes?new=1"
            className="text-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-3 transition"
          >
            Create a taste
          </Link>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-neutral-900 dark:text-white">Make your first mix</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
              From your “{first.name}” taste. It opens as a playlist, ready to play.
            </p>
            {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button
                key={p.id}
                type="button"
                disabled={!!pending}
                onClick={() => run(first._id, p.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition
                  bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending?.period === p.id && <Spinner size={14} />}
                {p.button}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}