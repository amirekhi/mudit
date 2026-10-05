"use client";

import { useState } from "react";
import { useEngineStore } from "@/store/useEngineStore";
import { useEditorStore } from "@/store/useEditorStore";
import { audioBufferToMp3 } from "@/util/engine/exportAudio";
import { tagMp3 } from "@/util/engine/id3Tag";
import { storage } from "@/lib/storage/storage";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { queryClient } from "@/lib/TanStackQuery/queryClient";

interface Props {
  onClose: () => void;
}

type Status = "idle" | "rendering" | "encoding" | "tagging" | "done" | "error";
type PublishStatus = "idle" | "uploading" | "done" | "error";

interface ExportResult {
  blob: Blob;
  filename: string;
  title: string;
  artist: string;
}

const sanitizeFilename = (name: string) =>
  name.trim().replace(/[^a-z0-9 _-]/gi, "").replace(/\s+/g, "_") || "untitled_project";

export default function ExportDialog({ onClose }: Props) {
  const renderProjectOffline = useEngineStore(s => s.renderProjectOffline);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bitrate, setBitrate] = useState(192);
  const [preventClipping, setPreventClipping] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [result, setResult] = useState<ExportResult | null>(null);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishError, setPublishError] = useState("");

  const publishing = publishStatus === "uploading";
  const busy = status === "rendering" || status === "encoding" || status === "tagging" || publishing;

  const handleCoverChange = (file: File | null) => {
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleExport = async () => {
    setErrorMsg("");
    setProgress(0);
    setResult(null);
    setPublishStatus("idle");
    setPublishError("");

    try {
      setStatus("rendering");
      // The render goes through the master chain (volume, mute, limiter)
      const buffer = await renderProjectOffline({ safetyLimiter: preventClipping });
      if (!buffer) {
        setErrorMsg("No project slates with audio to export.");
        setStatus("error");
        return;
      }

      setStatus("encoding");
      const mp3Blob = await audioBufferToMp3(buffer, bitrate, setProgress);

      setStatus("tagging");
      const taggedBlob = await tagMp3(mp3Blob, { title, artist, coverFile });

      const filename = `${sanitizeFilename(title || "untitled_project")}.mp3`;
      download(taggedBlob, filename);

      // Kept so the user can also save it to their library without rendering again
      setResult({
        blob: taggedBlob,
        filename,
        title: title.trim() || "Untitled",
        artist: artist.trim() || "Unknown Artist",
      });
      setStatus("done");
    } catch (err) {
      console.error("Export failed:", err);
      setErrorMsg("Something went wrong while rendering. Check the console for details.");
      setStatus("error");
    }
  };

  // Uploads the rendered MP3 (and cover) and adds it to the user's own tracks as a PRIVATE track.
  const handleSaveToLibrary = async () => {
    if (!result) return;
    setPublishStatus("uploading");
    setPublishError("");

    try {
      const mp3File = new File([result.blob], result.filename, { type: "audio/mpeg" });
      const url = await storage.uploadSongs(mp3File);
      const image = coverFile ? await storage.uploadImage(coverFile) : undefined;

      const res = await authFetch("/api/tracks/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: result.title, artist: result.artist, url, image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Could not save the track");

      // Refresh the editor library and any cached track lists
      const lib = await authFetch("/api/tracks/me");
      if (lib.ok) {
        const tracks = await lib.json();
        if (Array.isArray(tracks)) useEditorStore.getState().setLibrary(tracks);
      }
      for (const key of ["user-tracks", "my-tracks", "tracks"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }

      setPublishStatus("done");
    } catch (err) {
      console.error("Save to library failed:", err);
      setPublishError(err instanceof Error ? err.message : "Could not save the track");
      setPublishStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[90%] max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Export Project</h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-30"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-neutral-500">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={busy}
            placeholder="My Track"
            className="w-full px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-neutral-500">Artist</label>
          <input
            value={artist}
            onChange={e => setArtist(e.target.value)}
            disabled={busy}
            placeholder="Unknown Artist"
            className="w-full px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-neutral-500">Cover Image (optional)</label>
          <div className="flex items-center gap-3">
            {coverPreview && (
              <img src={coverPreview} alt="cover preview" className="w-12 h-12 rounded object-cover border border-neutral-200 dark:border-neutral-800" />
            )}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={e => handleCoverChange(e.target.files?.[0] ?? null)}
              className="text-xs text-neutral-500 dark:text-neutral-400"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-neutral-500">Quality</label>
          <select
            value={bitrate}
            onChange={e => setBitrate(Number(e.target.value))}
            disabled={busy}
            className="w-full px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 outline-none"
          >
            <option value={128}>128 kbps</option>
            <option value={192}>192 kbps (recommended)</option>
            <option value={256}>256 kbps</option>
            <option value={320}>320 kbps</option>
          </select>
        </div>

        <label className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer">
          <input
            type="checkbox"
            checked={preventClipping}
            onChange={e => setPreventClipping(e.target.checked)}
            disabled={busy}
            className="mt-0.5 accent-indigo-500"
          />
          <span>
            Prevent clipping
            <span className="block text-[10px] text-neutral-500">
              Soft-limits loud mixes instead of hard-clipping them. Has no effect if the master limiter is already on.
            </span>
          </span>
        </label>

        {errorMsg && <p className="text-xs text-red-500 dark:text-red-400">{errorMsg}</p>}

        <button
          onClick={handleExport}
          disabled={busy}
          className="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm text-white disabled:opacity-50"
        >
          {status === "rendering" && "Rendering audio…"}
          {status === "encoding" && `Encoding MP3… ${Math.round(progress * 100)}%`}
          {status === "tagging" && "Writing tags…"}
          {(status === "idle" || status === "done" || status === "error") && "Render & Download"}
        </button>

        {/* After a successful export: also keep it in the library */}
        {status === "done" && result && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Download started.</p>

            {publishStatus === "done" ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Saved to your tracks as &quot;{result.title}&quot; (private). You can find it in your library.
              </p>
            ) : (
              <>
                <button
                  onClick={handleSaveToLibrary}
                  disabled={publishing}
                  className="w-full px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-100 disabled:opacity-50"
                >
                  {publishing ? "Uploading…" : "Save to my tracks"}
                </button>
                {publishError && <p className="text-xs text-red-500 dark:text-red-400">{publishError}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
