export interface LrcLibResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface LyricsResult {
  found: boolean;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
  matchedTrack?: string;
  matchedArtist?: string;
  matchedAlbum?: string;
}

const NOT_FOUND: LyricsResult = {
  found: false,
  instrumental: false,
  plainLyrics: null,
  syncedLyrics: null,
};

// Module-level cache. Cheap guard against duplicate upstream calls within a
// single server process. Next's `fetch` cache (below) handles cross-request
// persistence/ISR.
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const cache = new Map<string, { data: LyricsResult; expires: number }>();

export async function searchLyrics(track: string, artist = ""): Promise<LyricsResult> {
  const cacheKey = `${track.toLowerCase()}::${artist.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  try {
    const params = new URLSearchParams({ track_name: track });
    if (artist) params.set("artist_name", artist);

    const res = await fetch(`https://lrclib.net/api/search?${params.toString()}`, {
      headers: {
        "User-Agent": "MuditMusicApp/1.0 (https://my-music-app.com)",
      },
      next: { revalidate: 60 * 60 * 24, tags: [`lyrics:${cacheKey}`] },
    });

    if (!res.ok) {
      cache.set(cacheKey, { data: NOT_FOUND, expires: Date.now() + CACHE_TTL_MS });
      return NOT_FOUND;
    }

    const results: LrcLibResult[] = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      cache.set(cacheKey, { data: NOT_FOUND, expires: Date.now() + CACHE_TTL_MS });
      return NOT_FOUND;
    }

    const best =
      results.find(r => r.syncedLyrics) ??
      results.find(r => r.plainLyrics) ??
      results[0];

    const data: LyricsResult = {
      found: true,
      instrumental: best.instrumental,
      plainLyrics: best.plainLyrics,
      syncedLyrics: best.syncedLyrics,
      matchedTrack: best.trackName,
      matchedArtist: best.artistName,
      matchedAlbum: best.albumName,
    };

    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.error("LRCLIB lookup failed:", err);
    return NOT_FOUND;
  }
}

/** Multiple candidate matches, for the search page. */
export async function searchLyricsList(query: string): Promise<LrcLibResult[]> {
  try {
    const params = new URLSearchParams({ q: query });
    const res = await fetch(`https://lrclib.net/api/search?${params.toString()}`, {
      headers: { "User-Agent": "MuditMusicApp/1.0 (https://my-music-app.com)" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const results: LrcLibResult[] = await res.json();
    return Array.isArray(results) ? results.slice(0, 15) : [];
  } catch (err) {
    console.error("LRCLIB search failed:", err);
    return [];
  }
}