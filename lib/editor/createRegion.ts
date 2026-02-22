import { EditorRegion } from "@/types/editorTypes";

export const createRegion = (
  trackId: string,
  start: number,
  end: number,
  parentRegionId: string | null = null,
  originRegionId?: string
): EditorRegion => {
  const now = Date.now();
  const duration = end - start;

  return {
    id: crypto.randomUUID(),
    sourceTrackId: trackId,

    // Timeline placement
    start,
    end,

    // 🔥 Immutable source slice
    sourceStart: 0,
    sourceEnd: duration,

    parentRegionId,

    edits: {},
    status: "empty",

    meta: {
      createdAt: now,
      updatedAt: now,
      originRegionId,
    },
  };
};
