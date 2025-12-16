import mongoose, { Schema, Types } from "mongoose";

export interface TrackDocument {
  title: string;
  artist: string;
  url: string;
  image?: string;
  prev?: Types.ObjectId;
  next?: Types.ObjectId;
}

const TrackSchema = new Schema<TrackDocument>(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    url: { type: String, required: true },
    image: { type: String },

    prev: { type: Schema.Types.ObjectId, ref: "Track" },
    next: { type: Schema.Types.ObjectId, ref: "Track" },
  },
  {
    timestamps: true,
    collection: "tracks", // 👈 explicitly set
  }
);

export default mongoose.models.Track ||
  mongoose.model<TrackDocument>("Track", TrackSchema);
