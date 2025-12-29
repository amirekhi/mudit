import { Track } from "@/store/useAudioStore";

export default function TrackHeader({ track }: { track: Track | null }) {
  return (
    <header className="h-16 border-b border-neutral-800 px-6 flex items-center justify-between">
      {track ? (
        <>
          <div>
            <div className="font-semibold">{track.title}</div>
            <div className="text-sm text-neutral-400">{track.artist}</div>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm">
              Save
            </button>
            <button className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm">
              Export
            </button>
          </div>
        </>
      ) : (
        <div className="text-neutral-500">Editor</div>
      )}
    </header>
  );
}
