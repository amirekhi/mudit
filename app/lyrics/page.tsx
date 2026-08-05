import type { Metadata } from "next";
import SearchBox from "@/components/lyrics/SearchBox";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";

export const metadata: Metadata = {
  title: "Search Song Lyrics",
  description: "Search for lyrics to any song.",
};

export default function LyricsSearchPage() {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="min-h-screen flex flex-col items-center justify-center
        bg-gradient-to-br from-neutral-50 via-white to-neutral-100
        dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4 py-10 transition-colors">

        {/* Header — matches CreateHubPage pattern */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Lyrics</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Search for any song or artist
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        {/* Search card */}
        <div className="w-full max-w-2xl">
          <SearchBox />
        </div>
      </div>
    </div>
  );
}