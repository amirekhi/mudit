export interface DeezerArtistMatch {
  deezerId: number;
  name: string;
  image: string | null; // highest-res picture Deezer has
  fanCount: number;
  albumCount: number;
}

/**
 * Looks up an artist by name on Deezer's public search API.
 * No API key required — this is a free, unauthenticated catalog endpoint.
 * Docs note: this must be called server-side; Deezer blocks direct
 * cross-origin calls from browser JS.
 */
export async function lookupArtistOnDeezer(name: string): Promise<DeezerArtistMatch | null> {
  const res = await fetch(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`
  );
  if (!res.ok) return null;

  const json = await res.json();
  const results: any[] = json?.data ?? [];
  if (results.length === 0) return null;

  // Prefer an exact (case-insensitive) name match over Deezer's fuzzy top result —
  // otherwise a search for "Air" could match "Air Supply" instead.
  const exact = results.find(r => r.name?.toLowerCase() === name.toLowerCase());
  const best = exact ?? results[0];

  return {
    deezerId: best.id,
    name: best.name,
    image: best.picture_xl || best.picture_big || best.picture_medium || null,
    fanCount: best.nb_fan ?? 0,
    albumCount: best.nb_album ?? 0,
  };
}