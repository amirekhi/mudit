import type { SlateRegion } from "./slateTypes";

export interface RegionClipboard {
  mode: "copy" | "cut";
  region: SlateRegion;
}