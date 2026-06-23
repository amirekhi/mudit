// lib/storage/index.ts

import { uploadImage }  from "@/lib/supabase/uploadImage";
import { uploadSongs } from "@/lib/supabase/uploadSongs";


export const storage = {
  uploadImage,
  uploadSongs,
};