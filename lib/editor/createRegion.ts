import { EditorRegion } from "@/types/editorTypes";

export const createRegion = (
  trackId: string,
  start: number,
  end: number,
  parentRegionId: string | null = null,
  originRegionId?: string
): EditorRegion => {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    sourceTrackId: trackId,

    start,
    end,

    parentRegionId,        // ✅ THIS IS WHAT YOU ARE MISSING

    edits: {},
    status: "empty",

    meta: {
      createdAt: now,
      updatedAt: now,
      originRegionId,      // lineage only
    },
  };
};
