import { dummyTracks } from "@/Data/Tracks";
import { Track, useAudioStore } from "@/store/useAudioStore";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";

export default function PlayButton({ track }: { track: Track }) {
  const isPlaying = useAudioStore(
    (state) => state.currentTrack?.id === track.id && state.isPlaying
  );
  const playTrack = useAudioStore((state) => state.playTrack);
  const togglePlay = useAudioStore((state) => state.togglePlay);
  const playTrackPlayList = usePlaylistStore((state) => state.playTrack);
  const setCurrentPlaylist = usePlaylistStore((state) => state.setCurrentPlaylist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      togglePlay();
    }else if (track.playlistId){
      setCurrentPlaylist(track.playlistId);
      setPlaylist(dummyTracks);
      playTrackPlayList(track.idx);
    } else playTrack(track);

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