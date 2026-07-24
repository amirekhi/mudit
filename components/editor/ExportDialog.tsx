"use client";

import { useState } from "react";
import { useEngineStore } from "@/store/useEngineStore";
import { audioBufferToMp3 } from "@/util/engine/exportAudio";
import { tagMp3 } from "@/util/engine/id3Tag";

interface Props {
  onClose: () => void;
}

type Status = "idle" | "rendering" | "encoding" | "tagging" | "done" | "error";

const sanitizeFilename = (name: string) =>
  name.trim().replace(/[^a-z0-9 _-]/gi, "").replace(/\s+/g, "_") || "untitled_project";

export default function ExportDialog({ onClose }: Props) {
  const renderProjectOffline = useEngineStore(s => s.renderProjectOffline);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bitrate, setBitrate] = useState(192);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "rendering" || status === "encoding" || status === "tagging";

  const handleCoverChange = (file: File | null) => {
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleExport = async () => {
    setErrorMsg("");
    try {
      setStatus("rendering");
      const buffer = await renderProjectOffline();
      if (!buffer) {
        setErrorMsg("No project slates with audio to export.");
        setStatus("error");
        return;
      }

      setStatus("encoding");
      const mp3Blob = audioBufferToMp3(buffer, bitrate);

      setStatus("tagging");
      const taggedBlob = await tagMp3(mp3Blob, { title, artist, coverFile });

      const url = URL.createObjectURL(taggedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFilename(title || "untitled_project")}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setStatus("done");
    } catch (err) {
      console.error("Export failed:", err);
      setErrorMsg("Something went wrong while rendering. Check the console for details.");
      setStatus("error");
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

        {errorMsg && <p className="text-xs text-red-500 dark:text-red-400">{errorMsg}</p>}

        {status === "done" && <p className="text-xs text-emerald-600 dark:text-emerald-400">Download started.</p>}

        <button
          onClick={handleExport}
          disabled={busy}
          className="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm text-white disabled:opacity-50"
        >
          {status === "rendering" && "Rendering audio…"}
          {status === "encoding" && "Encoding MP3…"}
          {status === "tagging" && "Writing tags…"}
          {(status === "idle" || status === "done" || status === "error") && "Render & Download"}
        </button>
      </div>
    </div>
  );
}