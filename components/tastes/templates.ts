import type { Mix } from "@/lib/recs/types";

export interface TasteTemplate {
  id: string;
  label: string;
  name: string;
  description: string;
  moods: { slug: string; weight: number }[];
  mix: Mix;
}

// Starting points only: they fill in the form, nothing is saved until you save.
export const TASTE_TEMPLATES: TasteTemplate[] = [
  {
    id: "wind-down",
    label: "Evening wind-down",
    name: "Evening wind-down",
    description: "Slow, soft songs for the end of the day",
    moods: [
      { slug: "chill", weight: 1 },
      { slug: "rainy-day", weight: 0.7 },
      { slug: "late-night", weight: 0.5 },
    ],
    mix: { recent: 30, exactMood: 40, newMood: 10, random: 5, rediscover: 15 },
  },
  {
    id: "workout",
    label: "Workout",
    name: "Workout",
    description: "High-energy songs to keep you moving",
    moods: [
      { slug: "workout", weight: 1 },
      { slug: "energetic", weight: 0.8 },
      { slug: "intense", weight: 0.6 },
    ],
    mix: { recent: 20, exactMood: 50, newMood: 15, random: 5, rediscover: 10 },
  },
  {
    id: "focus",
    label: "Deep focus",
    name: "Deep focus",
    description: "Steady songs that stay out of the way",
    moods: [
      { slug: "focus", weight: 1 },
      { slug: "chill", weight: 0.5 },
    ],
    mix: { recent: 40, exactMood: 40, newMood: 5, random: 0, rediscover: 15 },
  },
];