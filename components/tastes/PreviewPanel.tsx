"use client";

import Link from "next/link";
import { IconAlertTriangle, IconArrowsShuffle, IconCheck } from "@tabler/icons-react";
import { Spinner } from "@/components/basics/Spinner";
import { BUCKETS } from "@/lib/recs/types";
import type { PlaylistItemView, TrackMeta } from "@/lib/recs/service";
import type { PlaylistPreview } from "@/lib/TanStackQuery/Queries/tastes";
import { playlistPath } from "@/lib/recs/links";
import { BUCKET_META } from "./bucketMeta";

interface Props {
  preview: PlaylistPreview | null;
  loading: boolean;
  error: string | null;
  canPreview: boolean;
  onShuffle: () => void;
  onPlay: (track: TrackMeta) => void;
  currentTrackId: string | null;
  isPlaying: boolean;
  /** Set after "Make playlist" succeeds. */
  result: { playlistId: string; replaced: boolean } | null;
}

// The server writes bucket keys like "recent"; show the friendly names instead.
const friendly = (text: string) =>
  BUCKETS.reduce((t, b) => t.split(`"${b}"`).join(`"${BUCKET_META[b].label}"`), text);

function Row({ item, onPlay, active, playing }: { item: PlaylistItemView; onPlay: () => void; active: boolean; playing: boolean }) {
  const meta = BUCKET_META[item.bucket];
  return (
    <li>
      <button
        type="button"
        onClick={onPlay}
        className={`group w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
          active ? "bg-indigo-600/10" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
      >
        <div className="relative h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700">
          <img src={item.track.image || "/test.jpg"} alt="" className="h-full w-full object-cover" />
          <span className={`absolute inset-0 items-center justify-center bg-black/50 ${active && playing ? "flex" : "hidden group-hover:flex"}`}>
            {active && playing ? (
              <span className="flex gap-0.5 items-end h-3">
                <span className="w-0.5 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-0.5 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            ) : (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${active ? "text-indigo-600 dark:text-indigo-300" : "text-neutral-900 dark:text-white"}`}>
            {item.track.title}
          </p>
          <p className="text-xs text-neutral-500 truncate">
            {item.track.artist} · {item.reason}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>{meta.short}</span>
      </button>
    </li>
  );
}

export default function PreviewPanel({ preview, loading, error, canPreview, onShuffle, onPlay, currentTrackId, isPlaying, result }: Props) {
  const counts = preview
    ? BUCKETS.map(b => ({ b, n: preview.items.filter(i => i.bucket === b).length }))
    : [];

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 transition-colors">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            Preview
            {loading && preview && <Spinner size={14} />}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {preview ? `${preview.items.length} songs, picked just now` : "What this taste would play right now"}
          </p>
        </div>
        <button
          type="button"
          onClick={onShuffle}
          disabled={!canPreview || loading}
          title="Pick a different set of songs"
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <IconArrowsShuffle className="w-3.5 h-3.5" />
          {preview ? "Shuffle" : "Preview"}
        </button>
      </div>

      {result && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-300/50 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
          <IconCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="text-sm text-emerald-800 dark:text-emerald-300 leading-snug">
            {result.replaced ? "Playlist updated." : "Playlist saved."}{" "}
            <Link href={playlistPath(result.playlistId)} className="font-semibold underline underline-offset-2">Open playlist</Link>
            <span className="mx-1">·</span>
            <Link href={`/edit/updatePlaylist/${result.playlistId}`} className="font-semibold underline underline-offset-2">Edit it</Link>
          </div>
        </div>
      )}

      {!canPreview && !preview && (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center text-sm text-neutral-500">
          Pick at least one mood to see a preview.
        </div>
      )}

      {canPreview && !preview && !loading && !error && (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">Nothing previewed yet</p>
          <p className="text-xs text-neutral-500 mt-1">
            Press <span className="font-semibold">Preview</span> and it will keep updating as you tune.
          </p>
        </div>
      )}

      {loading && !preview && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">
          <Spinner size={16} /> Picking songs…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300/50 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {preview && (
        <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {preview.items.length > 0 && (
            <div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                {counts.map(({ b, n }) => (
                  <div key={b} className={`${BUCKET_META[b].bar} transition-all duration-300`} style={{ width: `${(n / preview.items.length) * 100}%` }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {counts.filter(c => c.n > 0).map(({ b, n }) => (
                  <span key={b} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className={`h-2 w-2 rounded-full ${BUCKET_META[b].bar}`} />
                    {BUCKET_META[b].short} {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300/50 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
              <IconAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300 leading-snug">
                {preview.warnings.map(w => <li key={w}>{friendly(w)}</li>)}
              </ul>
            </div>
          )}

          {preview.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center text-sm text-neutral-500">
              No songs available yet. Upload some tracks, then try again.
            </div>
          ) : (
            <ul className="space-y-0.5 max-h-[28rem] overflow-y-auto pr-1">
              {preview.items.map(item => (
                <Row
                  key={item.trackId}
                  item={item}
                  onPlay={() => onPlay(item.track)}
                  active={currentTrackId === item.trackId}
                  playing={isPlaying}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}