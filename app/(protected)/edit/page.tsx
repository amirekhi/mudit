"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function EditHubPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl w-full">

        {/* Edit Tracks Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl p-8 flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">
            Edit Tracks
          </h2>

          <p className="text-neutral-400 mb-6 leading-relaxed">
            Update existing tracks. Change metadata, replace audio files,
            manage visibility, and fine-tune how each track appears in your app.
          </p>

          <ul className="text-sm text-neutral-300 space-y-2 mb-8">
            <li>• Edit title, artist, and description</li>
            <li>• Replace or re-upload audio</li>
            <li>• Manage publish state</li>
          </ul>

          <div className="mt-auto">
            <Link
              href="/edit/tracks"
              className="block text-center rounded-xl bg-white text-neutral-900 font-medium py-3 hover:bg-neutral-200 transition"
            >
              Edit Tracks
            </Link>
          </div>
        </motion.div>

        {/* Edit Playlists Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl p-8 flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">
            Edit Playlists
          </h2>

          <p className="text-neutral-400 mb-6 leading-relaxed">
            Modify your playlists. Reorder tracks, rename playlists,
            update artwork, and control the listening flow.
          </p>

          <ul className="text-sm text-neutral-300 space-y-2 mb-8">
            <li>• Rename and reorganize playlists</li>
            <li>• Add or remove tracks</li>
            <li>• Adjust order and cover image</li>
          </ul>

          <div className="mt-auto">
            <Link
              href="/edit/playlists"
              className="block text-center rounded-xl border border-neutral-700 text-white font-medium py-3 hover:bg-neutral-800 transition"
            >
              Edit Playlists
            </Link>
          </div>
        </motion.div>

        {/* Advanced Track Editing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl p-8 flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">
            Advanced Track Editing
          </h2>

          <p className="text-neutral-400 mb-6 leading-relaxed">
            Go deeper into track customization. Perfect for power users who
            want full control over audio behavior and metadata.
          </p>

          <ul className="text-sm text-neutral-300 space-y-2 mb-8">
            <li>• Advanced metadata editing</li>
            <li>• Waveform and timing adjustments</li>
            <li>• Technical and experimental options</li>
          </ul>

          <div className="mt-auto">
            <Link
              href="/edit/tracks/advanced"
              className="block text-center rounded-xl border border-neutral-700 text-white font-medium py-3 hover:bg-neutral-800 transition"
            >
              Advanced Editor
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
