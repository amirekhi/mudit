// types/clipboard.ts
import { EditorRegion } from "@/types/editorTypes";

export type ClipboardMode = "copy" | "cut";

export interface RegionClipboard {
  regions: EditorRegion[];
  mode: ClipboardMode;
}
