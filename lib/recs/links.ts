/**
 * Where a playlist's own page lives. One place on purpose: if your playlist
 * page is at a different address, change this single line.
 */
export const playlistPath = (id: string) => `/playlists/${id}`;