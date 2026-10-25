"use client";

import { useState } from "react";
import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { BUCKETS, type Bucket, type Mix } from "@/lib/recs/types";
import { MIX_PRESETS, rebalanceMix } from "@/lib/recs/mix";
import { BUCKET_META } from "./bucketMeta";

interface Props {
  value: Mix;
  onChange: (mix: Mix) => void;
}

export default function MixEditor({ value, onChange }: Props) {
  const [locked, setLocked] = useState<Set<Bucket>>(new Set());

  const toggleLock = (b: Bucket) =>
    setLocked(prev => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });

  const activePreset = MIX_PRESETS.find(p => BUCKETS.every(b => p.mix[b] === value[b]))?.id;

  return (
    <div className="space-y-5">
      {/* Whole mix at a glance */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="img"
        aria-label={BUCKETS.map(b => `${BUCKET_META[b].label} ${value[b]}%`).join(", ")}
      >
        {BUCKETS.map(b => (
          <div
            key={b}
            className={`${BUCKET_META[b].bar} transition-all duration-300`}
            style={{ width: `${value[b]}%` }}
          />
        ))}
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {MIX_PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            title={p.description}
            onClick={() => onChange({ ...p.mix })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activePreset === p.id
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* One slider per part of the mix */}
      <ul className="space-y-4">
        {BUCKETS.map(b => {
          const meta = BUCKET_META[b];
          const isLocked = locked.has(b);
          return (
            <li key={b}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${meta.bar}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white leading-tight">{meta.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{meta.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleLock(b)}
                    title={isLocked ? "Unlock" : "Lock this value while you adjust the others"}
                    aria-label={isLocked ? `Unlock ${meta.label}` : `Lock ${meta.label}`}
                    aria-pressed={isLocked}
                    className={`p-1.5 rounded-full transition ${
                      isLocked
                        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/15"
                        : "text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    {isLocked ? <IconLock className="w-4 h-4" /> : <IconLockOpen className="w-4 h-4" />}
                  </button>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {value[b]}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={value[b]}
                disabled={isLocked}
                aria-label={`${meta.label} percentage`}
                onChange={e => onChange(rebalanceMix(value, b, Number(e.target.value), locked))}
                className={`w-full h-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${meta.accent}`}
              />
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Always adds up to 100%. Moving one slider adjusts the others; lock a row to keep it where it is.
      </p>
    </div>
  );
}