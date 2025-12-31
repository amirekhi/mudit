import { EditorRegion } from "@/types/editorTypes";

export const createRegion = (
  trackId: string,
  start: number,
  end: number,
  originRegionId?: string
): EditorRegion => {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    sourceTrackId: trackId,
    start,
    end,
    edits: {},
    status: "empty",
    meta: {
      createdAt: now,
      updatedAt: now,
      originRegionId,
    },
  };
};
