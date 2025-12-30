import { EditorRegion } from "@/types/editorTypes";

export const createEmptyRegion = (
  trackId: string,
  start: number,
  end: number
): EditorRegion => ({
  id: crypto.randomUUID(),
  sourceTrackId: trackId,
  start,
  end,
  edits: {},
  status: "empty",
});
