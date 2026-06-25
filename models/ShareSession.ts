import mongoose, { Schema, Document, Types } from "mongoose";

export interface IShareSession extends Document {
  cryptoId: string;
  playlistId: Types.ObjectId;
  ownerId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const ShareSessionSchema = new Schema<IShareSession>(
  {
    cryptoId: { type: String, required: true, unique: true },
    playlistId: { type: Schema.Types.ObjectId, ref: "Playlist", required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "share_sessions" }
);

export default mongoose.models.ShareSession ||
  mongoose.model<IShareSession>("ShareSession", ShareSessionSchema);