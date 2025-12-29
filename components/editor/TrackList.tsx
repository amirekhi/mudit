import { EditorTrack } from "@/types/editorTypes";
import { useMemo, useState } from "react";


interface Props {
  tracks: EditorTrack[];
  selectedTrack: EditorTrack | null;
  onSelect: (t: EditorTrack) => void;
}

export default function TrackList({ tracks, selectedTrack, onSelect }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return tracks.filter(t =>
      `${t.source.title} ${t.source.artist}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [tracks, query]);

  return (
    <div className="flex flex-col h-full">
      <input
        placeholder="Search tracks…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="mb-3 px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm outline-none"
      />

      <div className="space-y-1 overflow-y-auto">
        {filtered.map(track => (
          <button
            key={track.id}
            onClick={() => onSelect(track)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition
              ${
                selectedTrack?.id === track.id
                  ? "bg-indigo-600"
                  : "hover:bg-neutral-800"
              }`}
          >
            <div className="font-medium truncate">
              {track.source.title}
            </div>
            <div className="text-xs text-neutral-400 truncate">
              {track.source.artist}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
