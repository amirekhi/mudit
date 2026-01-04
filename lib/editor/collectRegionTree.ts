import { EditorRegion } from "@/types/editorTypes";

export function collectRegionTree(
  regions: EditorRegion[],
  rootId: string
): EditorRegion[] {
  const map = new Map<string, EditorRegion[]>();

  for (const r of regions) {
    if (r.parentRegionId) {
      if (!map.has(r.parentRegionId)) {
        map.set(r.parentRegionId, []);
      }
      map.get(r.parentRegionId)!.push(r);
    }
  }

  const result: EditorRegion[] = [];

  function dfs(id: string) {
    const node = regions.find(r => r.id === id);
    if (!node) return;

    result.push(node);

    const children = map.get(id) ?? [];
    for (const child of children) {
      dfs(child.id);
    }
  }

  dfs(rootId);
  return result;
}
