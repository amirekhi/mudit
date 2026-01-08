"use client";

import { Track } from "@/store/useAudioStore";
import PlaylistPlayButton from "./PlaylistPlayButton";

export interface Playlist {
  id: string;
  _id: string;
  title: string;
  description: string;
  image: string;
  tracks: Track[];
}

export default function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <div
      className="group relative w-64 min-w-[16rem] bg-neutral-900 hover:bg-neutral-800 transition-colors rounded-xl cursor-pointer overflow-hidden
                 max-md:w-52 max-md:min-w-[12rem] max-md:rounded-lg max-md:min-h-[180px]"
    >
      <div className="relative">
        <img
          src={playlist.image}
          alt={playlist.title}
          className="w-full h-40 object-cover max-md:h-28"
        />

        <div
          className="absolute bottom-3 right-3  md:opacity-0 group-hover:opacity-100 transition-opacity
                     max-md:bottom-1 max-md:right-1 max-md:scale-90"
        >
          <PlaylistPlayButton playlist={playlist} />
        </div>
      </div>

      <div className="p-4 max-md:p-1.5">
        <h3 className="text-lg font-semibold text-white max-md:text-sm">{playlist.title}</h3>
        <p className="text-sm text-neutral-400 mt-1 line-clamp-2 max-md:text-xs">
          {playlist.description}
        </p>
      </div>
    </div>
  );
}
