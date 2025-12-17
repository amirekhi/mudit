export async function fetchSongs() {
  const res = await fetch("/api/tracks/public");
  if (!res.ok) throw new Error("Failed to fetch songs");
  return res.json();
}
