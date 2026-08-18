// bot/fileCache.ts
//
// Caches downloaded Telegram file bytes in memory so replaying/scrubbing a
// track doesn't re-fetch from Telegram every single time. This is a plain
// module-level Map — it lives only as long as the Node process does. No
// disk, no DB, no external store. Restart the server and it's empty again,
// which matches the "buffered, dumped when the app instance is gone"
// requirement exactly.
//
// IMPORTANT CAVEAT: this only behaves as a real cache when the Next.js
// server is a single long-lived process (e.g. `next dev`, `next start`,
// or a persistent Node host). On Vercel's serverless functions, each
// invocation may run in a fresh isolate with its own memory, so this cache
// can silently miss most of the time in that environment. It's still
// correct (worst case: same behavior as no caching), just not guaranteed
// to help there. Fine for local dev / a persistent host; worth revisiting
// if this ever moves to serverless production.

interface CacheEntry {
  buffer: Buffer;
  mimeType: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes — long enough to feel instant on replay, short enough not to hoard memory

const cache = new Map<string, CacheEntry>();

// Removes anything past its TTL. Called lazily on each access rather than
// on a timer — simplest possible approach, no setInterval to manage.
function evictExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.cachedAt > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

export function getCachedFile(id: string): CacheEntry | undefined {
  evictExpired();
  return cache.get(id);
}

export function setCachedFile(id: string, buffer: Buffer, mimeType: string): void {
  evictExpired();
  cache.set(id, { buffer, mimeType, cachedAt: Date.now() });
}