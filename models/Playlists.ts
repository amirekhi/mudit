import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPlaylist extends Document {
  title: string;
  description?: string;
  image?: string;

  trackIds: Types.ObjectId[];

  ownerId?: Types.ObjectId | null;
  visibility: "public" | "private";

  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>(
  {
    title: { type: String, required: true },
    description: String,
    image: String,

    trackIds: [{ type: Schema.Types.ObjectId, ref: "Track" }],

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
  },
  { timestamps: true, collection: "playlists" }
);

export default mongoose.models.Playlist ||
  mongoose.model<IPlaylist>("Playlist", PlaylistSchema);
