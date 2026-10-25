import mongoose, { Schema, Types } from "mongoose";
import { BUCKETS, DEFAULT_MIX, DEFAULT_SETTINGS, validateMix, type Mix } from "@/lib/recs/types";

// A user's saved "recipe" for generating playlists: which moods, how to mix
// recent / exact / new / random / rediscover, how big, and when to refresh.
export interface TasteDocument {
  userId: Types.ObjectId;
  name: string;
  description?: string;

  moods: { slug: string; weight: number }[];
  mix: Mix;

  size: number;
  exactThreshold: number;
  looseThreshold: number;
  recentDays: number;
  rediscoverAfterDays: number;
  maxPerArtist: number;

  schedule: {
    frequency: "manual" | "daily" | "weekly" | "monthly";
    weekday: number;   // 0 (Sunday) to 6, used when weekly
    hour: number;      // 0 to 23, in `timezone`
    timezone: string;  // IANA name, e.g. "Asia/Baku"
    mode: "replace" | "new"; // update one playlist in place, or create a new one each run
  };
  nextRunAt?: Date;    // when a scheduled run is due
  lastRunAt?: Date;
  playlistId?: Types.ObjectId | null; // the playlist kept up to date in "replace" mode

  isActive: boolean;
}

const MixSchema = new Schema(
  Object.fromEntries(
    BUCKETS.map(b => [b, { type: Number, required: true, min: 0, max: 100, default: DEFAULT_MIX[b] }])
  ),
  { _id: false }
);

const TasteSchema = new Schema<TasteDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, maxlength: 300 },

    moods: {
      type: [
        new Schema(
          {
            slug: { type: String, required: true, lowercase: true, trim: true },
            weight: { type: Number, min: 0.1, max: 1, default: 1 },
          },
          { _id: false }
        ),
      ],
      validate: [(v: unknown[]) => v.length <= 8, "A taste can have at most 8 moods"],
      default: [],
    },

    mix: {
      type: MixSchema,
      default: () => ({ ...DEFAULT_MIX }),
      validate: {
        validator: (v: Mix) => validateMix(v) === null,
        message: "Mix percentages must be whole numbers that add up to 100",
      },
    },

    size: { type: Number, min: 5, max: 100, default: DEFAULT_SETTINGS.size },
    exactThreshold: { type: Number, min: 0, max: 1, default: DEFAULT_SETTINGS.exactThreshold },
    looseThreshold: { type: Number, min: 0, max: 1, default: DEFAULT_SETTINGS.looseThreshold },
    recentDays: { type: Number, min: 1, max: 365, default: DEFAULT_SETTINGS.recentDays },
    rediscoverAfterDays: { type: Number, min: 7, max: 3650, default: DEFAULT_SETTINGS.rediscoverAfterDays },
    maxPerArtist: { type: Number, min: 1, max: 10, default: DEFAULT_SETTINGS.maxPerArtist },

    schedule: {
      frequency: { type: String, enum: ["manual", "daily", "weekly", "monthly"], default: "manual" },
      weekday: { type: Number, min: 0, max: 6, default: 1 },
      hour: { type: Number, min: 0, max: 23, default: 7 },
      timezone: { type: String, default: "UTC" },
      mode: { type: String, enum: ["replace", "new"], default: "replace" },
    },
    nextRunAt: { type: Date },
    lastRunAt: { type: Date },
    playlistId: { type: Schema.Types.ObjectId, ref: "Playlist", default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "tastes" }
);

// The scheduler asks "which active tastes are due?"
TasteSchema.index({ isActive: 1, nextRunAt: 1 });

export default mongoose.models.Taste || mongoose.model<TasteDocument>("Taste", TasteSchema);