"use client";

import { IconSparkles } from "@tabler/icons-react";
import { Spinner } from "@/components/basics/Spinner";
import type { MoodView } from "@/lib/TanStackQuery/Queries/tastes";

interface Props {
  moods: MoodView[];
  loading: boolean;
  value: { slug: string; weight: number }[];
  onChange: (value: { slug: string; weight: number }[]) => void;
  max?: number;
  isAdmin: boolean;
  onSeed: () => void;
  seeding: boolean;
  seedError?: string | null;
}

const GROUPS: { key: string; label: string }[] = [
  { key: "energy", label: "Energy" },
  { key: "emotion", label: "Feeling" },
  { key: "activity", label: "Activity" },
  { key: "setting", label: "Setting" },
  { key: "other", label: "Other" },
];

const importance = (w: number) => (w >= 0.8 ? "High" : w >= 0.5 ? "Medium" : "Low");

export default function MoodPicker({ moods, loading, value, onChange, max = 8, isAdmin, onSeed, seeding, seedError }: Props) {
  const selected = new Map(value.map(v => [v.slug, v.weight]));
  const atMax = value.length >= max;
  const nameOf = (slug: string) => moods.find(m => m.slug === slug)?.name ?? slug;

  const toggle = (slug: string) => {
    if (selected.has(slug)) onChange(value.filter(v => v.slug !== slug));
    else if (!atMax) onChange([...value, { slug, weight: 1 }]);
  };

  const setWeight = (slug: string, weight: number) =>
    onChange(value.map(v => (v.slug === slug ? { ...v, weight } : v)));

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Spinner size={14} /> Loading moods…
      </div>
    );
  }

  if (moods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 text-center space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">There are no moods yet</p>
        {isAdmin ? (
          <>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Add the starter set (chill, energetic, focus and more) to get going.
            </p>
            <button
              type="button"
              onClick={onSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition"
            >
              {seeding ? <Spinner size={14} /> : <IconSparkles className="w-4 h-4" />}
              Add starter moods
            </button>
            {seedError && <p className="text-xs text-red-600 dark:text-red-400">{seedError}</p>}
          </>
        ) : (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">An admin needs to add the moods first.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {GROUPS.map(g => {
          const inGroup = moods.filter(m => (m.group || "other") === g.key);
          if (inGroup.length === 0) return null;
          return (
            <div key={g.key}>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {inGroup.map(m => {
                  const on = selected.has(m.slug);
                  return (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => toggle(m.slug)}
                      disabled={!on && atMax}
                      aria-pressed={on}
                      title={m.description}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        on
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500"
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {value.length === 0
          ? "Pick the moods this taste is about."
          : `${value.length} of ${max} selected${atMax ? " (that's the most)" : ""}`}
      </p>

      {/* How much each mood matters, only useful with more than one */}
      {value.length > 1 && (
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">How much each one matters</p>
          {value.map(v => (
            <div key={v.slug} className="flex items-center gap-3">
              <span className="w-28 sm:w-36 text-sm text-neutral-800 dark:text-neutral-200 truncate">{nameOf(v.slug)}</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={v.weight}
                onChange={e => setWeight(v.slug, Math.round(Number(e.target.value) * 10) / 10)}
                aria-label={`How much ${nameOf(v.slug)} matters`}
                className="flex-1 h-1 cursor-pointer accent-indigo-500"
              />
              <span className="w-14 text-right text-xs text-neutral-500 dark:text-neutral-400">{importance(v.weight)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}