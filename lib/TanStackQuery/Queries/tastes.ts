import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import type { TasteView, MoodView, PlaylistPreview } from "@/lib/recs/service";
import type { TasteFields } from "@/lib/recs/validate";
import type { PeriodKind } from "@/lib/recs/periods";

export type { TasteView, MoodView, PlaylistPreview, TasteFields };
export type GeneratedPlaylist = PlaylistPreview & { playlistId: string; title: string; replaced: boolean };
export type QuickMixResult = { playlistId: string; title: string; reused: boolean };

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Something went wrong");
  }
  return res.json() as Promise<T>;
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body ?? {}),
});

export const fetchMoods = () => authFetch("/api/moods").then(r => parse<MoodView[]>(r));
export const fetchTastes = () => authFetch("/api/tastes").then(r => parse<TasteView[]>(r));

export const createTaste = (fields: TasteFields) =>
  authFetch("/api/tastes", send("POST", fields)).then(r => parse<TasteView>(r));

export const updateTaste = (id: string, fields: TasteFields) =>
  authFetch(`/api/tastes/${id}`, send("PATCH", fields)).then(r => parse<TasteView>(r));

export const deleteTaste = (id: string) =>
  authFetch(`/api/tastes/${id}`, { method: "DELETE" }).then(r => parse<{ message: string }>(r));

/** Preview settings that may not be saved yet. Nothing is stored. */
export const previewTaste = (fields: TasteFields, seed?: string) =>
  authFetch("/api/tastes/preview", send("POST", { ...fields, ...(seed ? { seed } : {}) })).then(r =>
    parse<PlaylistPreview>(r)
  );

/** Builds and saves the playlist for a saved taste. */
export const generateFromTaste = (id: string, seed?: string) =>
  authFetch(`/api/tastes/${id}/generate`, send("POST", seed ? { seed } : {})).then(r => parse<GeneratedPlaylist>(r));

/** Today's / this week's / this month's mix for a taste. Returns the playlist to open. */
export const quickMix = (id: string, period: PeriodKind) =>
  authFetch(`/api/tastes/${id}/mix`, send("POST", { period })).then(r => parse<QuickMixResult>(r));

/** Admin only: adds the starter moods. */
export const seedMoods = () =>
  authFetch("/api/moods/seed", send("POST")).then(r => parse<{ added: number; total: number }>(r));

export function useTastes(options: { enabled?: boolean } = {}) {
  return useQuery<TasteView[], Error>({ queryKey: ["tastes"], queryFn: fetchTastes, enabled: options.enabled ?? true });
}

export function useMoods() {
  return useQuery<MoodView[], Error>({ queryKey: ["moods"], queryFn: fetchMoods, staleTime: 5 * 60_000 });
}