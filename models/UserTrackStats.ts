import mongoose, { Schema, Types } from "mongoose";

// Running totals per (user, track), updated every time a ListenEvent is
// recorded. The generator reads this instead of scanning the whole history.
export interface UserTrackStatsDocument {
  userId: Types.ObjectId;
  trackId: Types.ObjectId;
  plays: number;        // counted listens (not skips)
  skips: number;
  totalSeconds: number;
  firstPlayedAt?: Date;
  lastPlayedAt?: Date;
}

const UserTrackStatsSchema = new Schema<UserTrackStatsDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
    plays: { type: Number, default: 0 },
    skips: { type: Number, default: 0 },
    totalSeconds: { type: Number, default: 0 },
    firstPlayedAt: { type: Date },
    lastPlayedAt: { type: Date },
  },
  { collection: "user_track_stats" }
);

UserTrackStatsSchema.index({ userId: 1, trackId: 1 }, { unique: true });
UserTrackStatsSchema.index({ userId: 1, lastPlayedAt: -1 });

export default mongoose.models.UserTrackStats ||
  mongoose.model<UserTrackStatsDocument>("UserTrackStats", UserTrackStatsSchema);