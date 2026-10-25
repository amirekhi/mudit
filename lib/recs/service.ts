import { ObjectId, type Db, type Document } from "mongodb";
import { randomUUID } from "node:crypto";
import { OWNER_FIELD } from "@/lib/auth/authz";
import { COLLECTIONS } from "./db";
import { loadCandidates } from "./candidates";
import { generatePlaylist } from "./generator";
import { computeNextRun } from "./schedule";
import { canReuseMix, isPeriod, mixTitle, periodSeed, type PeriodKind, type RunKind } from "./periods";
import { RecError, parseTasteInput, DEFAULT_SCHEDULE, type TasteFields } from "./validate";
import {
  DEFAULT_MIX,
  DEFAULT_SETTINGS,
  type Bucket,
  type BucketReport,
  type GeneratedItem,
  type TasteConfig,
} from "./types";

/**
 * Everything the recommendation system can do, as plain functions.
 * The HTTP routes call these today; an AI agent's tools can call the very same
 * functions later. Each one is told WHO is acting and only ever touches that
 * person's own data.
 */

export interface Actor {
  userId: string;
  isAdmin: boolean;
  via: "ui" | "agent";
}

export const MAX_TASTES_PER_USER = 20;

const ID = /^[0-9a-f]{24}$/i;

function toOid(id: string, label = "id"): ObjectId {
  if (!ID.test(id)) throw new RecError(400, `Invalid ${label}`);
  return new ObjectId(id);
}

// ───────────────────────── moods ─────────────────────────

export interface MoodView {
  slug: string;
  name: string;
  group: string;
  description?: string;
}

export async function listMoods(db: Db): Promise<MoodView[]> {
  const rows = await db
    .collection(COLLECTIONS.moods)
    .find({ isActive: { $ne: false } })
    .project({ slug: 1, name: 1, group: 1, description: 1 })
    .sort({ group: 1, name: 1 })
    .toArray();
  return rows.map(r => ({
    slug: r.slug,
    name: r.name,
    group: r.group ?? "other",
    ...(r.description ? { description: r.description } : {}),
  }));
}

async function assertMoodsExist(db: Db, moods: { slug: string }[]) {
  const slugs = moods.map(m => m.slug);
  const found = await db
    .collection(COLLECTIONS.moods)
    .countDocuments({ slug: { $in: slugs }, isActive: { $ne: false } });
  if (found !== slugs.length) throw new RecError(400, "One or more moods don't exist");
}

// ───────────────────────── tastes ─────────────────────────

export interface TasteView extends TasteFields {
  _id: string;
  playlistId: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Older or hand-edited documents may be missing fields, so fill in defaults.
function toFields(doc: Document): TasteFields {
  return {
    name: doc.name,
    ...(doc.description ? { description: doc.description } : {}),
    moods: (doc.moods ?? []).map((m: { slug: string; weight?: number }) => ({ slug: m.slug, weight: m.weight ?? 1 })),
    mix: { ...DEFAULT_MIX, ...(doc.mix ?? {}) },
    size: doc.size ?? DEFAULT_SETTINGS.size,
    exactThreshold: doc.exactThreshold ?? DEFAULT_SETTINGS.exactThreshold,
    looseThreshold: doc.looseThreshold ?? DEFAULT_SETTINGS.looseThreshold,
    recentDays: doc.recentDays ?? DEFAULT_SETTINGS.recentDays,
    rediscoverAfterDays: doc.rediscoverAfterDays ?? DEFAULT_SETTINGS.rediscoverAfterDays,
    maxPerArtist: doc.maxPerArtist ?? DEFAULT_SETTINGS.maxPerArtist,
    schedule: { ...DEFAULT_SCHEDULE, ...(doc.schedule ?? {}) },
    isActive: doc.isActive !== false,
  };
}

const iso = (d: unknown) => (d ? new Date(d as Date).toISOString() : null);

function toView(doc: Document): TasteView {
  return {
    _id: String(doc._id),
    ...toFields(doc),
    playlistId: doc.playlistId ? String(doc.playlistId) : null,
    nextRunAt: iso(doc.nextRunAt),
    lastRunAt: iso(doc.lastRunAt),
    createdAt: iso(doc.createdAt) ?? "",
    updatedAt: iso(doc.updatedAt) ?? "",
  };
}

// Someone else's taste looks exactly like a missing one.
async function loadOwnedTaste(db: Db, actor: Actor, id: string): Promise<Document> {
  const doc = await db
    .collection(COLLECTIONS.tastes)
    .findOne({ _id: toOid(id, "taste id"), userId: new ObjectId(actor.userId) });
  if (!doc) throw new RecError(404, "Taste not found");
  return doc;
}

export async function listTastes(db: Db, actor: Actor): Promise<TasteView[]> {
  const rows = await db
    .collection(COLLECTIONS.tastes)
    .find({ userId: new ObjectId(actor.userId) })
    .sort({ updatedAt: -1 })
    .toArray();
  return rows.map(toView);
}

export async function getTaste(db: Db, actor: Actor, id: string): Promise<TasteView> {
  return toView(await loadOwnedTaste(db, actor, id));
}

export async function createTaste(db: Db, actor: Actor, body: unknown): Promise<TasteView> {
  const { merged } = parseTasteInput(body);
  await assertMoodsExist(db, merged.moods);

  const owner = new ObjectId(actor.userId);
  const tastes = db.collection(COLLECTIONS.tastes);
  if ((await tastes.countDocuments({ userId: owner })) >= MAX_TASTES_PER_USER) {
    throw new RecError(409, `You can have up to ${MAX_TASTES_PER_USER} tastes`);
  }

  const now = new Date();
  const doc: Document = {
    userId: owner,
    ...merged,
    playlistId: null,
    nextRunAt: merged.isActive ? computeNextRun(merged.schedule, now) : null,
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const res = await tastes.insertOne(doc);
  return toView({ ...doc, _id: res.insertedId });
}

export async function updateTaste(db: Db, actor: Actor, id: string, body: unknown): Promise<TasteView> {
  const existing = await loadOwnedTaste(db, actor, id);
  const { merged, provided } = parseTasteInput(body, toFields(existing));
  if (provided.moods) await assertMoodsExist(db, provided.moods);

  const set: Document = { ...provided, updatedAt: new Date() };
  if (provided.schedule || provided.isActive !== undefined) {
    set.nextRunAt = merged.isActive ? computeNextRun(merged.schedule) : null;
  }

  await db
    .collection(COLLECTIONS.tastes)
    .updateOne({ _id: existing._id, userId: new ObjectId(actor.userId) }, { $set: set });
  return getTaste(db, actor, id);
}

// Deleting a taste never deletes the playlists it made: those are the user's.
export async function deleteTaste(db: Db, actor: Actor, id: string): Promise<void> {
  const existing = await loadOwnedTaste(db, actor, id);
  await db.collection(COLLECTIONS.tastes).deleteOne({ _id: existing._id, userId: new ObjectId(actor.userId) });
}

// ───────────────────────── generating ─────────────────────────

export interface TrackMeta {
  _id: string;
  title: string;
  artist: string;
  url: string;
  image?: string;
}

export interface PlaylistItemView extends GeneratedItem {
  track: TrackMeta;
}

export interface PlaylistPreview {
  /** null when previewing settings that haven't been saved yet */
  tasteId: string | null;
  seed: string;
  items: PlaylistItemView[];
  report: Record<Bucket, BucketReport>;
  warnings: string[];
}

async function build(
  db: Db,
  actor: Actor,
  fields: TasteFields,
  tasteId: string | null,
  seedInput?: string
): Promise<PlaylistPreview> {
  const config: TasteConfig = {
    moods: fields.moods,
    mix: fields.mix,
    size: fields.size,
    exactThreshold: fields.exactThreshold,
    looseThreshold: fields.looseThreshold,
    recentDays: fields.recentDays,
    rediscoverAfterDays: fields.rediscoverAfterDays,
    maxPerArtist: fields.maxPerArtist,
  };

  const candidates = await loadCandidates(db, actor.userId, config.moods.map(m => m.slug));
  const seed = seedInput ?? randomUUID();
  const result = generatePlaylist({ candidates, taste: config, now: Date.now(), seed });

  const metaRows = result.items.length
    ? await db
        .collection(COLLECTIONS.tracks)
        .find({ _id: { $in: result.items.map(i => new ObjectId(i.trackId)) } })
        .project({ title: 1, artist: 1, image: 1, url: 1 })
        .toArray()
    : [];
  const meta = new Map<string, TrackMeta>(
    metaRows.map(r => [
      String(r._id),
      { _id: String(r._id), title: r.title, artist: r.artist, url: r.url, ...(r.image ? { image: r.image } : {}) },
    ])
  );

  // A track deleted a moment ago has no metadata; leave it out.
  const items: PlaylistItemView[] = [];
  for (const item of result.items) {
    const track = meta.get(item.trackId);
    if (track) items.push({ ...item, track });
  }

  return { tasteId, seed, items, report: result.report, warnings: result.warnings };
}

function parseSeed(seed: unknown): string | undefined {
  if (seed === undefined || seed === null || seed === "") return undefined;
  if (typeof seed !== "string" || seed.length > 100) throw new RecError(400, "seed must be text up to 100 characters");
  return seed;
}

/** Dry run: shows what the playlist would be and saves nothing. */
export async function previewPlaylist(db: Db, actor: Actor, tasteId: string, opts: { seed?: unknown } = {}) {
  const taste = await loadOwnedTaste(db, actor, tasteId);
  return build(db, actor, toFields(taste), String(taste._id), parseSeed(opts.seed));
}

/**
 * Dry run for settings that aren't saved yet, so the editor can show a live
 * preview while someone is still tuning. Same validation as saving; nothing
 * is written.
 */
export async function previewFromInput(db: Db, actor: Actor, body: unknown, opts: { seed?: unknown } = {}) {
  if (!body || typeof body !== "object") throw new RecError(400, "Invalid JSON body");
  const input = { ...(body as Record<string, unknown>) };
  if (typeof input.name !== "string" || !input.name.trim()) input.name = "Preview";

  const { merged } = parseTasteInput(input);
  await assertMoodsExist(db, merged.moods);
  return build(db, actor, merged, null, parseSeed(opts.seed ?? input.seed));
}

export type { RunKind, PeriodKind } from "./periods";

/**
 * Builds the playlist and saves it as a normal, private playlist owned by the
 * user. In "replace" mode the taste keeps ONE playlist per kind of mix (its
 * manual mix, its daily mix, ...) up to date; in "new" mode every run creates
 * a fresh one.
 */
export async function generatePlaylistForTaste(
  db: Db,
  actor: Actor,
  tasteId: string,
  opts: { seed?: unknown; kind?: RunKind } = {}
) {
  const taste = await loadOwnedTaste(db, actor, tasteId);
  const fields = toFields(taste);
  const kind: RunKind = opts.kind ?? "manual";
  const now = new Date();
  const tz = fields.schedule.timezone;
  const seed = parseSeed(opts.seed) ?? (kind === "manual" ? randomUUID() : periodSeed(kind, String(taste._id), now, tz));

  const preview = await build(db, actor, fields, String(taste._id), seed);
  if (preview.items.length === 0) {
    throw new RecError(409, "No eligible tracks yet. Upload or tag some tracks first.");
  }

  const owner = new ObjectId(actor.userId);
  const playlists = db.collection(COLLECTIONS.playlists);

  // trackIds are stored as strings, exactly like the add-to-playlist route does.
  const trackIds = preview.items.map(i => i.trackId);
  const image = preview.items.find(i => i.track.image)?.track.image;
  const generated = {
    tasteId: taste._id,
    kind,
    seed,
    generatedAt: now,
    items: preview.items.map(i => ({
      trackId: i.trackId,
      bucket: i.bucket,
      reason: i.reason,
      ...(i.backfill ? { backfill: true } : {}),
    })),
  };

  let playlistId: ObjectId | null = null;
  let title = mixTitle(fields.name, kind, fields.schedule.mode, now, tz);
  let replaced = false;

  if (fields.schedule.mode === "replace") {
    // Update this taste's mix of this kind in place. The title is left alone,
    // in case the user renamed the playlist.
    const existing = await playlists.findOne(
      { [OWNER_FIELD]: owner, "generated.tasteId": taste._id, "generated.kind": kind },
      { projection: { _id: 1, title: 1 }, sort: { "generated.generatedAt": -1 } }
    );
    if (existing) {
      await playlists.updateOne(
        { _id: existing._id, [OWNER_FIELD]: owner },
        { $set: { trackIds, generated, updatedAt: now, ...(image ? { image } : {}) } }
      );
      playlistId = existing._id as ObjectId;
      title = typeof existing.title === "string" ? existing.title : title;
      replaced = true;
    }
  }

  if (!playlistId) {
    const res = await playlists.insertOne({
      title,
      description: `Made for you from your "${fields.name}" taste`,
      ...(image ? { image } : {}),
      trackIds,
      [OWNER_FIELD]: owner,
      visibility: "private",
      generated,
      createdAt: now,
      updatedAt: now,
    });
    playlistId = res.insertedId;
  }

  await db.collection(COLLECTIONS.tastes).updateOne(
    { _id: taste._id, userId: owner },
    {
      $set: {
        lastRunAt: now,
        nextRunAt: fields.isActive ? computeNextRun(fields.schedule, now) : null,
        ...(kind === "manual" ? { playlistId } : {}),
      },
    }
  );

  return { ...preview, playlistId: String(playlistId), title, replaced };
}

/**
 * The home-page shortcut: today's / this week's / this month's mix for a
 * taste. The seed only changes when the period rolls over, so asking again
 * returns the same playlist straight away instead of rebuilding it, until the
 * day ends or the taste is edited.
 */
export async function quickMix(db: Db, actor: Actor, tasteId: string, periodInput: unknown) {
  if (!isPeriod(periodInput)) throw new RecError(400, "period must be daily, weekly or monthly");
  const period: PeriodKind = periodInput;

  const taste = await loadOwnedTaste(db, actor, tasteId);
  const fields = toFields(taste);
  const seed = periodSeed(period, String(taste._id), new Date(), fields.schedule.timezone);

  const existing = await db.collection(COLLECTIONS.playlists).findOne(
    {
      [OWNER_FIELD]: new ObjectId(actor.userId),
      "generated.tasteId": taste._id,
      "generated.kind": period,
      "generated.seed": seed,
    },
    { projection: { title: 1, generated: 1 } }
  );
  if (existing && canReuseMix(existing as { generated?: { seed?: string; generatedAt?: Date } }, seed, taste.updatedAt)) {
    return { playlistId: String(existing._id), title: String(existing.title ?? ""), reused: true };
  }

  const made = await generatePlaylistForTaste(db, actor, tasteId, { seed, kind: period });
  return { playlistId: made.playlistId, title: made.title, reused: false };
}