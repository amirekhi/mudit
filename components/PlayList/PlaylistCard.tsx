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
    <div className="group relative w-64 min-w-[16rem] bg-neutral-900 hover:bg-neutral-800 transition-colors rounded-xl cursor-pointer overflow-hidden">
      <div className="relative">
        <img
          src={playlist.image}
          alt={playlist.title}
          className="w-full h-40 object-cover"
        />

      
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <PlaylistPlayButton playlist={playlist} />
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-white">{playlist.title}</h3>
        <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
          {playlist.description}
        </p>
      </div>
    </div>
  );
}
