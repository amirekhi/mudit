import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGeneratedMeta {
  tasteId: Types.ObjectId;
  kind: "manual" | "daily" | "weekly" | "monthly";
  seed: string;
  generatedAt: Date;
  /** Why each track is here (which bucket, how strong the match). */
  items: {
    trackId: string; // stored as a string, like trackIds on playlists
    bucket: "recent" | "exactMood" | "newMood" | "random" | "rediscover";
    reason: string;
    backfill?: boolean;
  }[];
}

export interface IPlaylist extends Document {
  title: string;
  description?: string;
  image?: string;

  trackIds: Types.ObjectId[];

  ownerId?: Types.ObjectId | null;
  visibility: "public" | "private";

  // Set only on playlists made by the recommendation system.
  generated?: IGeneratedMeta;

  createdAt: Date;
  updatedAt: Date;
}

const GeneratedSchema = new Schema<IGeneratedMeta>(
  {
    tasteId: { type: Schema.Types.ObjectId, ref: "Taste", required: true },
    kind: { type: String, enum: ["manual", "daily", "weekly", "monthly"], required: true },
    seed: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    items: [
      new Schema(
        {
          trackId: { type: String, required: true },
          bucket: {
            type: String,
            enum: ["recent", "exactMood", "newMood", "random", "rediscover"],
            required: true,
          },
          reason: { type: String },
          backfill: { type: Boolean },
        },
        { _id: false }
      ),
    ],
  },
  { _id: false }
);

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

    generated: { type: GeneratedSchema, default: undefined },
  },
  { timestamps: true, collection: "playlists" }
);

export default mongoose.models.Playlist ||
  mongoose.model<IPlaylist>("Playlist", PlaylistSchema);