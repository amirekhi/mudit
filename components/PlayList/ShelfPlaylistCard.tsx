"use client";

import { Playlist } from "./PlaylistCard";
import PlaylistPlayButton from "./PlaylistPlayButton";
import { usePlaylistStore } from "@/store/usePlaylistStore";

export default function ShelfPlaylistCard({ playlist }: { playlist: Playlist }) {
  const setPlaylist = usePlaylistStore(s => s.setPlaylist);
  const playTrack = usePlaylistStore(s => s.playTrack);
  const togglePlay = usePlaylistStore(s => s.togglePlay);
  const isPlaylistPlaying = usePlaylistStore(
    s => s.currentPlaylist === playlist._id && s.isPlaying
  );

  const handlePlay = () => {
    if (isPlaylistPlaying) {
      togglePlay();
    } else {
      setPlaylist(playlist.tracks);
      usePlaylistStore.setState({ currentPlaylist: playlist._id });
      if (playlist.tracks.length > 0) playTrack(0);
    }
  };

  return (
    <div
      onClick={handlePlay}
      className="group relative flex-shrink-0 w-36 max-md:w-28 flex flex-col gap-2 cursor-pointer"
    >
      <div
        className="relative w-36 h-36 max-md:w-28 max-md:h-28 rounded-xl overflow-hidden
          border-2 border-amber-400/40 dark:border-amber-500/30 shadow-sm
          group-hover:-translate-y-1 group-hover:shadow-lg transition-all"
      >
        <img src={playlist.image || "/test.jpg"} alt={playlist.title} className="w-full h-full object-cover" />
        <div
          className="absolute bottom-1.5 right-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity scale-90"
          onClick={e => e.stopPropagation()}
        >
          <PlaylistPlayButton playlist={playlist} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">{playlist.title}</p>
        <p className="text-[10px] text-amber-600 dark:text-amber-400">{playlist.tracks?.length ?? 0} tracks</p>
      </div>
    </div>
  );
}