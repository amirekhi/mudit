import { ObjectId, type Db, type Document } from "mongodb";
import { OWNER_FIELD } from "@/lib/auth/authz";
import { COLLECTIONS } from "./db";
import type { Actor } from "./service";
import type { RunKind } from "./periods";

/**
 * Everything the Home page needs that's personal to the signed-in user:
 *  - madeForYou: playlists the taste system generated
 *  - tastePicks: a blend of songs from those playlists
 *  - recent: what they've listened to lately
 */

/** Same shape as the Track type the player uses. */
export interface HomeTrack {
  _id: string;
  title: string;
  artist: string;
  url: string;
  image?: string;
  ownerId?: string | null;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  /** Only on "recent": when it was last played */
  lastPlayedAt?: string;
}

export interface MadeForYouPlaylist {
  _id: string;
  title: string;
  image?: string;
  tasteId: string;
  tasteName: string;
  kind: RunKind;
  generatedAt: string;
  trackCount: number;
}

export interface HomeForYou {
  madeForYou: MadeForYouPlaylist[];
  tastePicks: HomeTrack[];
  recent: HomeTrack[];
}

const MADE_FOR_YOU_LIMIT = 12;
const TASTE_PICKS_LIMIT = 20;
const TASTE_PICKS_FROM = 4; // how many taste playlists to blend
const RECENT_LIMIT = 20;

const HEX24 = /^[0-9a-f]{24}$/i;
const iso = (d: unknown) => (d ? new Date(d as Date).toISOString() : "");

export function toHomeTrack(doc: Document, lastPlayedAt?: unknown): HomeTrack {
  return {
    _id: String(doc._id),
    title: doc.title,
    artist: doc.artist,
    url: doc.url,
    ...(doc.image ? { image: doc.image } : {}),
    ownerId: doc.ownerId ? String(doc.ownerId) : null,
    visibility: doc.visibility === "private" ? "private" : "public",
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
    ...(lastPlayedAt ? { lastPlayedAt: iso(lastPlayedAt) } : {}),
  };
}

// Only tracks this user may hear, whatever the playlist or history says.
async function loadTracks(db: Db, owner: ObjectId, ids: string[]): Promise<Map<string, Document>> {
  const oids = ids.filter(id => HEX24.test(id)).map(id => new ObjectId(id));
  if (oids.length === 0) return new Map();
  const rows = await db
    .collection(COLLECTIONS.tracks)
    .find({ _id: { $in: oids }, $or: [{ [OWNER_FIELD]: owner }, { visibility: "public" }] })
    .toArray();
  return new Map(rows.map(r => [String(r._id), r]));
}

/** One track from each list in turn, skipping repeats, so no single playlist dominates. */
function roundRobin(lists: string[][], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < limit; i++) {
    let any = false;
    for (const list of lists) {
      if (i >= list.length) continue;
      any = true;
      const id = String(list[i]);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
        if (out.length >= limit) break;
      }
    }
    if (!any) break;
  }
  return out;
}

export async function getHomeForYou(db: Db, actor: Actor): Promise<HomeForYou> {
  const owner = new ObjectId(actor.userId);

  const [playlistRows, statsRows] = await Promise.all([
    db
      .collection(COLLECTIONS.playlists)
      .find({ [OWNER_FIELD]: owner, generated: { $exists: true } })
      .sort({ "generated.generatedAt": -1 })
      .limit(MADE_FOR_YOU_LIMIT)
      .project({ title: 1, image: 1, trackIds: 1, generated: 1 })
      .toArray(),
    db
      .collection(COLLECTIONS.stats)
      .find({ userId: owner, lastPlayedAt: { $exists: true } })
      .sort({ lastPlayedAt: -1 })
      .limit(RECENT_LIMIT * 2) // spare rows, in case some tracks have since been deleted
      .project({ trackId: 1, lastPlayedAt: 1 })
      .toArray(),
  ]);

  // Names of the tastes behind those playlists
  const tasteIds = [...new Set(playlistRows.map(p => String(p.generated?.tasteId)))].filter(id => HEX24.test(id));
  const tasteRows = tasteIds.length
    ? await db
        .collection(COLLECTIONS.tastes)
        .find({ _id: { $in: tasteIds.map(id => new ObjectId(id)) }, userId: owner })
        .project({ name: 1 })
        .toArray()
    : [];
  const tasteNames = new Map(tasteRows.map(t => [String(t._id), String(t.name)]));

  const madeForYou: MadeForYouPlaylist[] = playlistRows.map(p => ({
    _id: String(p._id),
    title: String(p.title ?? ""),
    ...(p.image ? { image: p.image } : {}),
    tasteId: String(p.generated.tasteId),
    tasteName: tasteNames.get(String(p.generated.tasteId)) ?? "",
    kind: p.generated.kind as RunKind,
    generatedAt: iso(p.generated.generatedAt),
    trackCount: Array.isArray(p.trackIds) ? p.trackIds.length : 0,
  }));

  // "Your taste": blend songs from the latest playlist of each taste.
  const latestPerTaste: Document[] = [];
  const seenTastes = new Set<string>();
  for (const p of playlistRows) {
    const key = String(p.generated?.tasteId);
    if (seenTastes.has(key)) continue;
    seenTastes.add(key);
    latestPerTaste.push(p);
    if (latestPerTaste.length >= TASTE_PICKS_FROM) break;
  }
  const pickIds = roundRobin(
    latestPerTaste.map(p => (Array.isArray(p.trackIds) ? p.trackIds.map(String) : [])),
    TASTE_PICKS_LIMIT
  );

  const recentIds = statsRows.map(r => String(r.trackId));
  const trackMap = await loadTracks(db, owner, [...pickIds, ...recentIds]);

  const tastePicks = pickIds.flatMap(id => (trackMap.has(id) ? [toHomeTrack(trackMap.get(id)!)] : []));
  const recent = statsRows
    .flatMap(r => (trackMap.has(String(r.trackId)) ? [toHomeTrack(trackMap.get(String(r.trackId))!, r.lastPlayedAt)] : []))
    .slice(0, RECENT_LIMIT);

  return { madeForYou, tastePicks, recent };
}