import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Track from "@/models/Track";
import Artist from "@/models/Artist";
import { lookupArtistOnDeezer } from "@/lib/artists/deezerLookup";
import { slugifyArtistName } from "@/lib/artists/slugify";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(MONGODB_URI);
}

export const maxDuration = 300;

/**
 * POST /api/artists/sync
 * Weekly job: scans public tracks, extracts distinct artist names, looks
 * each one up on Deezer, and upserts an Artist document with their image
 * URL + stats. We store Deezer's own image URL directly rather than
 * re-hosting it — no storage cost, and Deezer's artist images are served
 * off a public CDN meant for exactly this kind of embedding.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.ARTIST_SYNC_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const artistNames: string[] = await Track.distinct("artist", { visibility: "public" });

    const results = { processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

    for (const rawName of artistNames) {
      const name = rawName?.trim();
      if (!name) {
        results.skipped++;
        continue;
      }

      results.processed++;

      try {
        const slug = slugifyArtistName(name);
        const existing = await Artist.findOne({ slug });

        const match = await lookupArtistOnDeezer(name);
        if (!match) {
          results.skipped++;
          continue;
        }

        await Artist.findOneAndUpdate(
          { slug },
          {
            name,
            slug,
            image: match.image, // Deezer's CDN URL, stored as-is
            deezerId: match.deezerId,
            fanCount: match.fanCount,
            albumCount: match.albumCount,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        existing ? results.updated++ : results.created++;

        // Stay well under Deezer's ~50 requests / 5 seconds rate limit
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.error(`Failed to sync artist "${name}":`, err);
        results.failed++;
      }
    }

    return NextResponse.json({ ok: true, ...results }, { status: 200 });
  } catch (error) {
    console.error("Artist sync error:", error);
    return NextResponse.json({ message: "Failed to sync artists" }, { status: 500 });
  }
}