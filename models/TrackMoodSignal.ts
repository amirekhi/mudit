import mongoose, { Schema, Types } from "mongoose";

// Raw evidence that a track fits (or doesn't fit) a mood, from any source:
// the uploader, a listener's vote, a third-party API, an AI model or agent.
// `lib/recs/aggregate.ts` combines these into the `moods` scores on the Track.
// Keeping the evidence means scores can be recomputed when the weights change.
export interface TrackMoodSignalDocument {
  trackId: Types.ObjectId;
  moodSlug: string;
  source: "manual" | "uploader" | "vote" | "lastfm" | "llm" | "audio" | "agent";
  value: number;       // 1 = fits, 0 = doesn't
  confidence: number;  // 0 to 1
  userId: Types.ObjectId | null; // who voted/uploaded; null for automatic sources
}

const TrackMoodSignalSchema = new Schema<TrackMoodSignalDocument>(
  {
    trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
    moodSlug: { type: String, required: true, lowercase: true, trim: true },
    source: {
      type: String,
      enum: ["manual", "uploader", "vote", "lastfm", "llm", "audio", "agent"],
      required: true,
    },
    value: { type: Number, required: true, min: 0, max: 1 },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "track_mood_signals" }
);

// One signal per (track, mood, source, person): re-running a tagger or
// changing a vote replaces the old value instead of piling up duplicates.
TrackMoodSignalSchema.index({ trackId: 1, moodSlug: 1, source: 1, userId: 1 }, { unique: true });
TrackMoodSignalSchema.index({ trackId: 1 });

export default mongoose.models.TrackMoodSignal ||
  mongoose.model<TrackMoodSignalDocument>("TrackMoodSignal", TrackMoodSignalSchema);