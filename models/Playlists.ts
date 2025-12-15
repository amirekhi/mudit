import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPlaylist extends Document {
  title: string;
  description?: string;
  image?: string; // URL or path
  trackIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>(
  {
    title: { type: String, required: true },
    description: String,
    image: String,
    trackIds: [{ type: Schema.Types.ObjectId, ref: "Track" }],
  },
  { timestamps: true }
);

export const PlaylistModel = mongoose.models.Playlist || mongoose.model<IPlaylist>("Playlist", PlaylistSchema);
