import mongoose, { Schema, Types } from "mongoose";

// One row per time a track was played. Append-only history. The "recently
// listened" and "haven't heard in a while" buckets are built from this (via
// UserTrackStats, which is the fast summary of these rows).
export interface ListenEventDocument {
  userId: Types.ObjectId;
  trackId: Types.ObjectId;
  startedAt: Date;
  playedSeconds: number;
  durationSeconds?: number;
  /** skip: stopped within a few seconds. partial: some of it. listen: a real listen. */
  outcome: "skip" | "partial" | "listen";
  source: {
    kind: "home" | "playlist" | "search" | "recommendation" | "other";
    refId?: string; // e.g. the playlist id
  };
}

const ListenEventSchema = new Schema<ListenEventDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    playedSeconds: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, min: 0 },
    outcome: { type: String, enum: ["skip", "partial", "listen"], required: true },
    source: {
      kind: {
        type: String,
        enum: ["home", "playlist", "search", "recommendation", "other"],
        default: "other",
      },
      refId: { type: String },
    },
  },
  { timestamps: false, collection: "listen_events" }
);

ListenEventSchema.index({ userId: 1, startedAt: -1 });
ListenEventSchema.index({ userId: 1, trackId: 1, startedAt: -1 });

export default mongoose.models.ListenEvent ||
  mongoose.model<ListenEventDocument>("ListenEvent", ListenEventSchema);