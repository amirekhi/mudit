import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { searchLyrics } from "@/lib/lyrics/lrclib";
import { slugify, unslugify } from "@/lib/slug";
import { parseLrc } from "@/lib/lyrics/lrcParser";
import LyricsDisplay from "@/components/lyrics/LyricsDisplay";

interface Props {
  params: Promise<{ artist: string; title: string }>;
}

export const revalidate = 86400;
export const dynamicParams = true;

async function getResult(artistSlug: string, titleSlug: string) {
  const artist = unslugify(artistSlug);
  const title = unslugify(titleSlug);
  const result = await searchLyrics(title, artist);
  return { artist, title, result };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist: artistSlug, title: titleSlug } = await params;
  const { result } = await getResult(artistSlug, titleSlug);

  if (!result.found) {
    return { title: "Lyrics not found", robots: { index: false, follow: false } };
  }

  const song = result.matchedTrack ?? unslugify(titleSlug);
  const artist = result.matchedArtist ?? unslugify(artistSlug);
  const description = result.plainLyrics
    ? `Read the lyrics to "${song}" by ${artist}.`
    : `Lyrics to "${song}" by ${artist}.`;

  return {
    title: `${song} Lyrics — ${artist}`,
    description,
    alternates: { canonical: `/lyrics/${slugify(artist)}/${slugify(song)}` },
    openGraph: {
      title: `${song} — ${artist} Lyrics`,
      description,
      type: "music.song",
    },
    twitter: {
      card: "summary",
      title: `${song} — ${artist} Lyrics`,
      description,
    },
  };
}

export default async function LyricsPage({ params }: Props) {
  const { artist: artistSlug, title: titleSlug } = await params;
  const { artist, title, result } = await getResult(artistSlug, titleSlug);

  if (!result.found) notFound();

  const canonicalArtistSlug = slugify(result.matchedArtist ?? artist);
  const canonicalTitleSlug = slugify(result.matchedTrack ?? title);
  if (canonicalArtistSlug !== artistSlug || canonicalTitleSlug !== titleSlug) {
    redirect(`/lyrics/${canonicalArtistSlug}/${canonicalTitleSlug}`);
  }

  const lines = result.syncedLyrics ? parseLrc(result.syncedLyrics) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: result.matchedTrack,
    byArtist: { "@type": "MusicGroup", name: result.matchedArtist },
    ...(result.matchedAlbum && { inAlbum: { "@type": "MusicAlbum", name: result.matchedAlbum } }),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
        {result.matchedTrack}
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400 mb-6">{result.matchedArtist}</p>

      <LyricsDisplay
        instrumental={result.instrumental}
        plainLyrics={result.plainLyrics}
        lines={lines}
      />
    </div>
  );
}