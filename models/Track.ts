import mongoose, { Schema, Types } from "mongoose";

export interface TrackDocument {
  title: string;
  artist: string;
  url: string;
  image?: string;

  ownerId?: Types.ObjectId | null;
  visibility: "public" | "private";

  prev?: Types.ObjectId;
  next?: Types.ObjectId;
}

const TrackSchema = new Schema<TrackDocument>(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    url: { type: String, required: true },
    image: { type: String },

    // ownership
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    prev: { type: Schema.Types.ObjectId, ref: "Track" },
    next: { type: Schema.Types.ObjectId, ref: "Track" },
  },
  {
    timestamps: true,
    collection: "tracks",
  }
);

// ✅ THIS LINE IS REQUIRED
export default mongoose.models.Track ||
  mongoose.model<TrackDocument>("Track", TrackSchema);



  type DraftTrack = {
  id: string;
  file: File;
  title: string;
  artist: string;
  imageFile?: File;
  imagePreview?: string;
  visibility: "public" | "private";
  selected: boolean;
};
export type { DraftTrack };