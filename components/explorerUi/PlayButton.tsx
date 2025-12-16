import { dummyTracks } from "@/Data/Tracks";
import { Track, useAudioStore } from "@/store/useAudioStore";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";

export default function PlayButton({ track }: { track: Track }) {
  const isPlaying = useAudioStore(
    (state) => state.currentTrack?._id === track._id && state.isPlaying
  );
  const playTrack = useAudioStore((state) => state.playTrack);
  const togglePlay = useAudioStore((state) => state.togglePlay);
  const setCurrentPlaylist = usePlaylistStore((state) => state.setCurrentPlaylist);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      togglePlay();
    }else {
      setCurrentPlaylist(null);
      playTrack(track);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="p-3 rounded-full bg-indigo-500 hover:bg-indigo-600 transition-colors shadow-lg"
    >
      {isPlaying ? (
        <IconPlayerPause className="w-5 h-5 text-white" />
      ) : (
        <IconPlayerPlay className="w-5 h-5 text-white" />
      )}
    </button>
  );
}