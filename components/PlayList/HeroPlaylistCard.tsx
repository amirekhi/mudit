"use client";

import { Playlist } from "./PlaylistCard";
import PlaylistPlayButton from "./PlaylistPlayButton";

export default function HeroPlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <div
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
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <PlaylistPlayButton playlist={playlist} />
        </div>
      </div>
    </div>
  );
}