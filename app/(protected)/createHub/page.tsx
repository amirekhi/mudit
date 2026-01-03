"use client";

import BackButton from "@/components/basics/BackButton";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CreateHubPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-6">
    <div className="absolute top-4 right-4 z-50">
      <BackButton/>
    </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl w-full">

        {/* Song Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl p-8 flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">Create a New Song</h2>

          <p className="text-neutral-400 mb-6 leading-relaxed">
            Upload a new track, edit its details, fine-tune metadata, and decide
            whether it belongs to a playlist or stands alone. This is your space
            to shape a song from idea to final version.
          </p>

          <ul className="text-sm text-neutral-300 space-y-2 mb-8">
            <li>• Upload and manage audio files</li>
            <li>• Edit title, artist, and description</li>
            <li>• Add to playlists or keep it independent</li>
          </ul>

          <div className="mt-auto">
            <Link
              href="/createSong"
              className="block text-center rounded-xl bg-white text-neutral-900 font-medium py-3 hover:bg-neutral-200 transition"
            >
              Create Song
            </Link>
          </div>
        </motion.div>

        {/* Playlist Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl p-8 flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">Create a Playlist</h2>

          <p className="text-neutral-400 mb-6 leading-relaxed">
            Group your songs into playlists. Give them a name, customize their
            order, and curate a listening experience that tells a story.
          </p>

          <ul className="text-sm text-neutral-300 space-y-2 mb-8">
            <li>• Create and name playlists</li>
            <li>• Add or remove songs anytime</li>
            <li>• Customize order and appearance</li>
          </ul>

          <div className="mt-auto">
            <Link
              href="/createPlaylist"
              className="block text-center rounded-xl border border-neutral-700 text-white font-medium py-3 hover:bg-neutral-800 transition"
            >
              Create Playlist
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
