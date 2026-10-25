import mongoose, { Schema } from "mongoose";

// The shared vocabulary of moods tracks can be tagged with and tastes can ask
// for. Curated on purpose (a fixed list, not free text) so "chill" and
// "Chill " and "relaxing" never become three different moods.
export interface MoodDocument {
  slug: string;        // stable id, e.g. "chill"; what tracks and tastes store
  name: string;        // display label, e.g. "Chill"
  group?: "energy" | "emotion" | "activity" | "setting" | "other";
  description?: string;
  aliases: string[];   // other words that map to this mood (third-party tags, AI output)
  color?: string;
  isActive: boolean;
}

const MoodSchema = new Schema<MoodDocument>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    group: { type: String, enum: ["energy", "emotion", "activity", "setting", "other"], default: "other" },
    description: { type: String },
    aliases: { type: [String], default: [] },
    color: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "moods" }
);

export default mongoose.models.Mood || mongoose.model<MoodDocument>("Mood", MoodSchema);