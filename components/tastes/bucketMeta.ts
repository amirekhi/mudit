import type { Bucket } from "@/lib/recs/types";

// Full class names on purpose: Tailwind only keeps classes it can see written out.
export interface BucketMeta {
  label: string;
  short: string;
  description: string;
  bar: string;    // solid fill
  chip: string;   // small badge
  accent: string; // slider colour
}

export const BUCKET_META: Record<Bucket, BucketMeta> = {
  recent: {
    label: "Recently played",
    short: "Recent",
    description: "Songs you've listened to lately",
    bar: "bg-sky-500",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    accent: "accent-sky-500",
  },
  exactMood: {
    label: "Matches the mood",
    short: "Mood",
    description: "Songs that fit your moods best",
    bar: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    accent: "accent-indigo-500",
  },
  newMood: {
    label: "New to you",
    short: "New",
    description: "Songs you haven't heard yet that fit the mood",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    accent: "accent-emerald-500",
  },
  random: {
    label: "Wildcard",
    short: "Wildcard",
    description: "A few random picks to keep things fresh",
    bar: "bg-pink-500",
    chip: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
    accent: "accent-pink-500",
  },
  rediscover: {
    label: "Not heard in a while",
    short: "Rediscover",
    description: "Old favourites you haven't played for a while",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    accent: "accent-amber-500",
  },
};