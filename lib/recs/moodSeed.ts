// Starter vocabulary. Seeding only ever inserts missing moods; it never
// changes or removes one you've edited.
export interface MoodSeed {
  slug: string;
  name: string;
  group: "energy" | "emotion" | "activity" | "setting";
  aliases: string[];
}

export const MOOD_SEED: MoodSeed[] = [
  { slug: "chill", name: "Chill", group: "energy", aliases: ["relaxing", "relaxed", "calm", "laid back", "easy listening"] },
  { slug: "energetic", name: "Energetic", group: "energy", aliases: ["upbeat", "high energy", "pumped"] },
  { slug: "intense", name: "Intense", group: "energy", aliases: ["powerful", "heavy", "driving"] },
  { slug: "happy", name: "Happy", group: "emotion", aliases: ["feel good", "joyful", "cheerful", "sunny"] },
  { slug: "sad", name: "Sad", group: "emotion", aliases: ["melancholy", "melancholic", "heartbreak", "blue"] },
  { slug: "romantic", name: "Romantic", group: "emotion", aliases: ["love", "sensual", "intimate"] },
  { slug: "dreamy", name: "Dreamy", group: "emotion", aliases: ["atmospheric", "ethereal", "spacey"] },
  { slug: "dark", name: "Dark", group: "emotion", aliases: ["moody", "brooding", "gloomy"] },
  { slug: "angry", name: "Angry", group: "emotion", aliases: ["aggressive", "rage"] },
  { slug: "nostalgic", name: "Nostalgic", group: "emotion", aliases: ["retro", "throwback", "vintage"] },
  { slug: "uplifting", name: "Uplifting", group: "emotion", aliases: ["inspiring", "motivational", "hopeful"] },
  { slug: "focus", name: "Focus", group: "activity", aliases: ["concentration", "study", "deep work"] },
  { slug: "workout", name: "Workout", group: "activity", aliases: ["gym", "running", "training"] },
  { slug: "party", name: "Party", group: "activity", aliases: ["club", "dance", "danceable"] },
  { slug: "sleep", name: "Sleep", group: "activity", aliases: ["bedtime", "lullaby"] },
  { slug: "driving", name: "Driving", group: "activity", aliases: ["road trip", "night drive"] },
  { slug: "epic", name: "Epic", group: "setting", aliases: ["cinematic", "dramatic", "orchestral"] },
  { slug: "acoustic", name: "Acoustic", group: "setting", aliases: ["unplugged", "stripped"] },
  { slug: "late-night", name: "Late night", group: "setting", aliases: ["night", "after hours"] },
  { slug: "rainy-day", name: "Rainy day", group: "setting", aliases: ["rain", "cozy", "autumn"] },
];