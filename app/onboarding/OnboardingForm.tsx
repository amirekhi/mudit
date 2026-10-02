"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { IconMusic, IconCamera } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/basics/ThemeToggle";
import { storage } from "@/lib/storage/storage";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { queryClient } from "@/lib/TanStackQuery/queryClient";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function OnboardingForm({ username }: { username: string }) {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Free the temporary preview URL when it changes or the page unmounts
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const mutation = useMutation({
    // file === null means "skip": the server falls back to the default avatar
    mutationFn: async (file: File | null) => {
      const profileImageUrl = file ? await storage.uploadImage(file) : null;

      const res = await authFetch("/api/user/me/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save your profile.");
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["current-user"], data.user);
      router.replace("/");
      router.refresh();
    },
  });

  function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError("Image must be 5 MB or smaller.");
      return;
    }
    setFileError(null);
    setProfileImage(file);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden flex items-center justify-center
      bg-gradient-to-b from-neutral-100 to-white dark:from-black dark:to-zinc-900 px-4 py-10 transition-colors"
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <div
          className="bg-white/80 dark:bg-zinc-950/60 backdrop-blur-xl border
          border-neutral-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center gap-2">
              <IconMusic className="w-7 h-7 text-purple-500 dark:text-purple-400" />
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Mudit</h1>
            </div>
            <h2 className="text-lg font-medium text-neutral-900 dark:text-white">
              Welcome, {username}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-zinc-400">
              Add a profile photo so people recognise your playlists and tracks.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <label className="relative cursor-pointer group">
              <img
                src={preview || "/userAvatar.webp"}
                alt="Your profile photo"
                className="h-28 w-28 rounded-full object-cover border border-neutral-200 dark:border-zinc-700 transition group-hover:opacity-70"
              />
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full
                bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition"
              >
                <IconCamera className="w-6 h-6 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
            </label>
            <span className="text-xs text-neutral-400 dark:text-zinc-500">
              {profileImage ? profileImage.name : "Click the photo to choose an image"}
            </span>
          </div>

          {fileError && (
            <p className="text-red-500 dark:text-red-400 text-sm text-center">{fileError}</p>
          )}
          {mutation.isError && (
            <p className="text-red-500 dark:text-red-400 text-sm text-center">
              {(mutation.error as Error).message}
            </p>
          )}

          <div className="space-y-2">
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 text-sm transition"
              onClick={() => mutation.mutate(profileImage)}
              disabled={mutation.isPending || !profileImage}
            >
              {mutation.isPending ? "Saving…" : "Save and continue"}
            </Button>
            <button
              type="button"
              onClick={() => mutation.mutate(null)}
              disabled={mutation.isPending}
              className="w-full text-sm text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-white py-2 transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}