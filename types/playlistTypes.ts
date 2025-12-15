// types/playlist.ts
export interface PlaylistDb {
  title: string;
  description?: string;
  image?: string; // optional, can be a URL or path
  trackIds: string[]; // only IDs of tracks
}