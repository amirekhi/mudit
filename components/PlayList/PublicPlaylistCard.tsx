"use client";

import { Playlist } from "./PlaylistCard";
import PlaylistPlayButton from "./PlaylistPlayButton";

export default function PublicPlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <div className="group relative w-72 min-w-[18rem] min-h-[300px] bg-neutral-900 hover:bg-neutral-800 transition-colors rounded-2xl cursor-pointer overflow-hidden
                    max-md:w-60 max-md:min-w-[15rem] max-md:min-h-[250px]">
      <div className="relative">
        <img
          src={playlist.image}
          alt={playlist.title}
          className="w-full h-48 object-cover rounded-t-2xl max-md:h-36"
        />

        <div className="absolute bottom-3 right-3 md:opacity-0 group-hover:opacity-100 transition-opacity max-md:bottom-2 max-md:right-2">
          <PlaylistPlayButton playlist={playlist} />
        </div>
      </div>

      <div className="p-4 max-md:p-2">
        <h3 className="text-lg font-semibold text-white max-md:text-sm">{playlist.title}</h3>
        <p className="text-sm text-neutral-400 mt-1 line-clamp-2 max-md:text-xs">
          {playlist.description}
        </p>
      </div>
    </div>
  );
}
