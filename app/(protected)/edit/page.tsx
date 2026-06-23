"use client";

import BackButton from "@/components/basics/BackButton";
import { motion } from "framer-motion";
import Link from "next/link";
import { IconMusic, IconList } from "@tabler/icons-react";

export default function EditHubPage() {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="min-h-screen flex flex-col items-center justify-center
        bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-10">

        <div className="w-full max-w-5xl flex items-center justify-between mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-white">Edit</h1>
            <p className="text-sm text-neutral-400 mt-0.5">What would you like to edit?</p>
          </div>
          <BackButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl p-6 md:p-8 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <IconMusic className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-white">Edit Tracks</h2>
            </div>

            <p className="text-neutral-400 mb-6 leading-relaxed text-sm md:text-base">
              Update track metadata, swap cover art, change visibility, or remove
              tracks you no longer need.
            </p>

            <ul className="text-sm text-neutral-300 space-y-2 mb-8">
              <li>• Edit title, artist, and cover image</li>
              <li>• Add existing tracks to playlists</li>
              <li>• Delete tracks you own</li>
            </ul>

            <div className="mt-auto">
              <Link
                href="/songs/edit"
                className="block text-center rounded-xl bg-white text-neutral-900
                  font-medium py-3 hover:bg-neutral-200 transition text-sm"
              >
                Edit Tracks
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl p-6 md:p-8 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <IconList className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-white">Edit Playlists</h2>
            </div>

            <p className="text-neutral-400 mb-6 leading-relaxed text-sm md:text-base">
              Rename playlists, reorder tracks, swap the cover, change visibility,
              or remove playlists entirely.
            </p>

            <ul className="text-sm text-neutral-300 space-y-2 mb-8">
              <li>• Rename and update cover art</li>
              <li>• Add, remove, and reorder songs</li>
              <li>• Delete playlists you own</li>
            </ul>

            <div className="mt-auto">
              <Link
                href="/playlists/edit"
                className="block text-center rounded-xl border border-neutral-700
                  text-white font-medium py-3 hover:bg-neutral-800 transition text-sm"
              >
                Edit Playlists
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="md:col-span-2 rounded-2xl bg-neutral-900 border border-indigo-500/30
              shadow-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6"
          >
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">
                Advanced Editor
              </h2>
              <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                Cut, splice, layer, and arrange clips across slates. Mix multiple
                tracks into a project and export as MP3.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/edit/studio/"
                className="block text-center rounded-xl bg-indigo-600 hover:bg-indigo-500
                  text-white font-medium py-3 px-8 transition text-sm"
              >
                Open Editor
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}