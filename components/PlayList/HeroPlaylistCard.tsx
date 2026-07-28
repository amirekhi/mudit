"use client";

import { Playlist } from "./PlaylistCard";
import PlaylistPlayButton from "./PlaylistPlayButton";
import { usePlaylistStore } from "@/store/usePlaylistStore";

export default function HeroPlaylistCard({ playlist }: { playlist: Playlist }) {
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
      className="group relative flex-shrink-0 w-80 max-md:w-64 h-48 max-md:h-40 rounded-2xl overflow-hidden
        shadow-lg hover:shadow-2xl cursor-pointer transition-shadow"
    >
      <img
        src={playlist.image}
        alt={playlist.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-lg leading-tight truncate">{playlist.title}</h3>
          <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{playlist.description}</p>
        </div>
        <div
          className="flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <PlaylistPlayButton playlist={playlist} />
        </div>
      </div>
    </div>
  );
}