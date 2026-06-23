import { createClient } from "./supabase";

export async function uploadImage(file: File): Promise<string> {
const ext = file.name.split(".").pop();
const filePath = `users/${crypto.randomUUID()}.${ext}`;
console.log("Uploading to path:", filePath)
  const client = createClient();

  const { data, error } = await client.storage
    .from("mudit")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("UPLOAD ERROR:", error);
    throw error;
  }

  const { data: publicData } = client.storage
    .from("mudit")
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}