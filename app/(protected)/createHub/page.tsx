"use client";

import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CreateHubPage() {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="min-h-screen flex flex-col items-center justify-center
        bg-gradient-to-br from-neutral-50 via-white to-neutral-100
        dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4 py-10 transition-colors">

        {/* Header — inline on mobile, absolute on desktop */}
        <div className="w-full max-w-5xl flex items-center justify-between mb-8 md:mb-10 ">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Create</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">What would you like to make?</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full">

          {/* Song card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl p-6 md:p-8 flex flex-col transition-colors"
          >
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              Create a New Song
            </h2>

            <p className="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed text-sm md:text-base">
              Upload a new track, edit its details, fine-tune metadata, and decide
              whether it belongs to a playlist or stands alone.
            </p>

            <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-2 mb-8">
              <li>• Upload and manage audio files</li>
              <li>• Edit title, artist, and description</li>
              <li>• Add to playlists or keep it independent</li>
            </ul>

            <div className="mt-auto">
              <Link
                href="/createSong"
                className="block text-center rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900
                  font-medium py-3 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition text-sm"
              >
                Create Song
              </Link>
            </div>
          </motion.div>

          {/* Playlist card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl p-6 md:p-8 flex flex-col transition-colors"
          >
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              Create a Playlist
            </h2>

            <p className="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed text-sm md:text-base">
              Group your songs into playlists. Give them a name, customize their
              order, and curate a listening experience that tells a story.
            </p>

            <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-2 mb-8">
              <li>• Create and name playlists</li>
              <li>• Add or remove songs anytime</li>
              <li>• Customize order and appearance</li>
            </ul>

            <div className="mt-auto">
              <Link
                href="/createPlaylist"
                className="block text-center rounded-xl border border-neutral-300 dark:border-neutral-700
                  text-neutral-900 dark:text-white font-medium py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-sm"
              >
                Create Playlist
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}