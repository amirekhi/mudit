// lib/playlists/hydratePlaylists.ts
import { ObjectId } from "mongodb";

export async function hydratePlaylists(db: any, playlists: any[]) {
  const objectIds = [
    ...new Set(
      playlists
        .flatMap(p => p.trackIds ?? [])
        .filter(id => ObjectId.isValid(id))
    ),
  ].map(id => new ObjectId(id));

  const tracks = objectIds.length
    ? await db.collection("tracks").find({ _id: { $in: objectIds } }).toArray()
    : [];

  const trackMap = new Map(
    tracks.map((t: any) => [t._id.toString(), t])
  );

  return playlists.map(p => ({
    ...p,
    tracks: (p.trackIds ?? [])
      .map((id: string) => trackMap.get(id.toString()))
      .filter(Boolean),
  }));
}
