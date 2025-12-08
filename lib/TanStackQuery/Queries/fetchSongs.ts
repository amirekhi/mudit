export async function fetchSongs() {
  const res = await fetch("/api/songs");
  if (!res.ok) throw new Error("Failed to fetch songs");
  return res.json();
}
