import mongoose, { Schema } from "mongoose";

export interface ArtistDocument {
  name: string;
  slug: string;
  image?: string | null;
  deezerId?: number | null;
  fanCount: number;
  albumCount: number;
  lastSyncedAt: Date;
}

const ArtistSchema = new Schema<ArtistDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: null },
    deezerId: { type: Number, default: null },
    fanCount: { type: Number, default: 0 },
    albumCount: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "artists",
  }
);

export default mongoose.models.Artist ||
  mongoose.model<ArtistDocument>("Artist", ArtistSchema);