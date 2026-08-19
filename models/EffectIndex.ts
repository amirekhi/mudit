import mongoose, { Schema } from "mongoose";

// Stores metadata ONLY — never audio bytes. `fileId` is just Telegram's
// reference string used to fetch the actual file on demand; the bytes
// themselves still only ever live in the in-memory cache (bot/fileCache.ts),
// exactly as before. This model exists purely so the search index survives
// across serverless invocations, since Vercel's filesystem can't hold
// bot/index.json reliably in production.
export interface EffectIndexDocument {
  id: string; // short id we generate — NOT Telegram's raw file_id, used in URLs
  name: string; // clean display label — caption if present, else filename
  artist?: string; // ID3 performer tag if present, else parsed from filename, else omitted
  searchText: string; // lowercased combination of every text field Telegram gave us
  fileId: string; // Telegram's file_id — needed later to fetch actual bytes
  mimeType: string;
  thumbFileId?: string; // Telegram's embedded thumbnail file_id, if present
  addedAt: Date;
}

const EffectIndexSchema = new Schema<EffectIndexDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    artist: { type: String },
    searchText: { type: String, required: true },
    fileId: { type: String, required: true },
    mimeType: { type: String, required: true },
    thumbFileId: { type: String },
    addedAt: { type: Date, default: Date.now },
  },
  {
    collection: "effect_index",
  }
);

// ✅ Required to avoid model-overwrite errors on hot reload / repeated imports
export default mongoose.models.EffectIndex ||
  mongoose.model<EffectIndexDocument>("EffectIndex", EffectIndexSchema);