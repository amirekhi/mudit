// types/playlist.ts
export interface PlaylistDb {
  title: string;
  description?: string;
  image?: string;
  trackIds: string[];
  visibility: "public" | "private";
}
