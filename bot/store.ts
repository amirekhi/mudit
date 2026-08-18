// bot/store.ts
//
// Same exported shape as before (EffectEntry, readIndex, addEntry,
// searchIndex, findById) so nothing calling this module — the search
// route, stream route, thumb route — needs to change. Only the storage
// backend changed: MongoDB instead of a local JSON file, because Vercel's
// serverless filesystem can't reliably persist bot/index.json across
// invocations. This model only ever stores small text metadata (name,
// Telegram's file_id reference) — never audio bytes. The actual mp3 data
// still only lives in the in-memory cache (bot/fileCache.ts), fetched on
// demand, exactly as before.

import mongoose from "mongoose";
import EffectIndex, { EffectIndexDocument } from "@/models/EffectIndex";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

export interface EffectEntry {
  id: string;
  name: string;
  searchText?: string;
  fileId: string;
  mimeType: string;
  thumbFileId?: string;
  addedAt: string; // kept as an ISO string, same shape callers already expect
}

function toEntry(doc: EffectIndexDocument): EffectEntry {
  return {
    id: doc.id,
    name: doc.name,
    searchText: doc.searchText,
    fileId: doc.fileId,
    mimeType: doc.mimeType,
    thumbFileId: doc.thumbFileId,
    addedAt:
      doc.addedAt instanceof Date ? doc.addedAt.toISOString() : String(doc.addedAt),
  };
}

// Escapes regex special characters in user input before it's used inside a
// MongoDB $regex query — without this, a search like "c++" or "(loop)"
// would throw as an invalid regex instead of just searching literally.
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function readIndex(): Promise<EffectEntry[]> {
  const docs = await EffectIndex.find({}).sort({ addedAt: 1 }).lean();
  return docs.map(toEntry);
}

// Kept for interface compatibility with the old file-based version, though
// nothing currently calls this — Mongo entries are added one at a time via
// addEntry as posts arrive, not written in bulk.
export async function writeIndex(entries: EffectEntry[]): Promise<void> {
  await EffectIndex.deleteMany({});
  if (entries.length === 0) return;
  await EffectIndex.insertMany(
    entries.map((e) => ({ ...e, addedAt: new Date(e.addedAt) }))
  );
}

export async function addEntry(entry: EffectEntry): Promise<void> {
  await EffectIndex.create({
    ...entry,
    addedAt: new Date(entry.addedAt),
  });
}

// Case-insensitive substring search against searchText, falling back to
// name for any legacy entries that somehow lack searchText.
export async function searchIndex(query: string): Promise<EffectEntry[]> {
  const q = query.trim();
  if (!q) {
    const docs = await EffectIndex.find({}).sort({ addedAt: -1 }).lean();
    return docs.map(toEntry);
  }

  const pattern = escapeRegex(q);
  const docs = await EffectIndex.find({
    $or: [
      { searchText: { $regex: pattern, $options: "i" } },
      { name: { $regex: pattern, $options: "i" } },
    ],
  })
    .sort({ addedAt: -1 })
    .lean();

  return docs.map(toEntry);
}

export async function findById(id: string): Promise<EffectEntry | undefined> {
  const doc = await EffectIndex.findOne({ id }).lean();
  return doc ? toEntry(doc) : undefined;
}