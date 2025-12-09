"use client";

import { Playlist } from "./PlaylistCard";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";

export default function PlaylistPlayButton({ playlist }: { playlist: Playlist }) {
  const setPlaylist = usePlaylistStore((s) => s.setPlaylist);
  const playTrack = usePlaylistStore((s) => s.playTrack);
  const togglePlay = usePlaylistStore((s) => s.togglePlay);

  const isPlaylistPlaying = usePlaylistStore((state) => {
    return (
      state.currentPlaylist === playlist.id &&
      state.isPlaying
    );
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaylistPlaying) {
      togglePlay();
    } else {
      setPlaylist(playlist.tracks);
      usePlaylistStore.setState({ currentPlaylist: playlist.id });

      if (playlist.tracks.length > 0) {
        playTrack(0);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="p-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors shadow-lg"
    >
      {isPlaylistPlaying ? (
        <IconPlayerPause className="w-5 h-5 text-white" />
      ) : (
        <IconPlayerPlay className="w-5 h-5 text-white" />
      )}
    </button>
  );
}
