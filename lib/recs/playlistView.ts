import { ObjectId, type Db } from "mongodb";
import { OWNER_FIELD } from "@/lib/auth/authz";
import { COLLECTIONS } from "./db";
import { toHomeTrack, type HomeTrack } from "./home";
import type { Bucket } from "./types";
import type { RunKind } from "./periods";
import { RecError } from "./validate";

/** A playlist ready to show: its songs in order, and (for made-for-you mixes) why each is there. */
export interface PlaylistViewTrack extends HomeTrack {
  /** Only on playlists the taste system made */
  bucket?: Bucket;
  reason?: string;
}

export interface PlaylistView {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  visibility: "public" | "private";
  isOwner: boolean;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
  generated?: {
    kind: RunKind;
    tasteId: string;
    /** Only filled in for the owner */
    tasteName?: string;
    generatedAt: string;
  };
  tracks: PlaylistViewTrack[];
  /** Songs on the playlist that are gone or that this viewer can't hear */
  unavailable: number;
}

const HEX24 = /^[0-9a-f]{24}$/i;
const iso = (d: unknown) => (d ? new Date(d as Date).toISOString() : "");

/**
 * Public playlists can be opened by anyone. Private ones only by their owner;
 * to everyone else they look like they don't exist. A viewer only ever gets
 * songs they're allowed to hear.
 */
export async function getPlaylistView(db: Db, viewerId: string | null, id: string): Promise<PlaylistView> {
  if (!HEX24.test(id)) throw new RecError(404, "Playlist not found");

  const playlist = await db.collection(COLLECTIONS.playlists).findOne({ _id: new ObjectId(id) });
  if (!playlist) throw new RecError(404, "Playlist not found");

  const isOwner = !!viewerId && String(playlist[OWNER_FIELD] ?? "") === viewerId;
  const visibility = playlist.visibility === "public" ? "public" : "private";
  if (visibility !== "public" && !isOwner) throw new RecError(404, "Playlist not found");

  const trackIds: string[] = (Array.isArray(playlist.trackIds) ? playlist.trackIds : []).map(String);
  const oids = trackIds.filter(t => HEX24.test(t)).map(t => new ObjectId(t));

  // The owner may hear their own private songs; anyone else only public ones.
  const trackFilter = isOwner
    ? { $or: [{ [OWNER_FIELD]: new ObjectId(viewerId!) }, { visibility: "public" }] }
    : { visibility: "public" };

  const [trackRows, ownerRow, tasteRow] = await Promise.all([
    oids.length ? db.collection(COLLECTIONS.tracks).find({ _id: { $in: oids }, ...trackFilter }).toArray() : Promise.resolve([]),
    playlist[OWNER_FIELD]
      ? db.collection("users").findOne({ _id: playlist[OWNER_FIELD] as ObjectId }, { projection: { username: 1 } })
      : Promise.resolve(null),
    isOwner && playlist.generated?.tasteId
      ? db.collection(COLLECTIONS.tastes).findOne({ _id: playlist.generated.tasteId as ObjectId }, { projection: { name: 1 } })
      : Promise.resolve(null),
  ]);

  const byId = new Map(trackRows.map(r => [String(r._id), r]));
  const why = new Map<string, { bucket: Bucket; reason?: string }>(
    ((playlist.generated?.items ?? []) as { trackId: unknown; bucket: Bucket; reason?: string }[]).map(i => [
      String(i.trackId),
      { bucket: i.bucket, reason: i.reason },
    ])
  );

  // Keep the playlist's own order; leave out songs that are gone or off limits.
  const tracks: PlaylistViewTrack[] = trackIds.flatMap(tid => {
    const doc = byId.get(tid);
    if (!doc) return [];
    const reason = why.get(tid);
    return [{ ...toHomeTrack(doc), ...(reason ? { bucket: reason.bucket, reason: reason.reason } : {}) }];
  });

  return {
    _id: String(playlist._id),
    title: String(playlist.title ?? ""),
    ...(playlist.description ? { description: String(playlist.description) } : {}),
    ...(playlist.image ? { image: String(playlist.image) } : {}),
    visibility,
    isOwner,
    ...(ownerRow?.username ? { ownerName: String(ownerRow.username) } : {}),
    createdAt: iso(playlist.createdAt),
    updatedAt: iso(playlist.updatedAt),
    ...(playlist.generated
      ? {
          generated: {
            kind: playlist.generated.kind as RunKind,
            tasteId: String(playlist.generated.tasteId),
            ...(tasteRow?.name ? { tasteName: String(tasteRow.name) } : {}),
            generatedAt: iso(playlist.generated.generatedAt),
          },
        }
      : {}),
    tracks,
    unavailable: trackIds.length - tracks.length,
  };
}