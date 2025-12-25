// types/playlist.ts
export interface PlaylistDb {
  _id?: string;
  title: string;
  description?: string;
  image?: string;
  trackIds: string[];
  visibility: "public" | "private";
}
