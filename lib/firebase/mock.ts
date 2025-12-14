export async function uploadProfileImage(file: File): Promise<string> {
  // TEMP: replace with Firebase later
  return URL.createObjectURL(file);
}
