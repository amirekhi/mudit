// store/useTopBannerStore.ts
// store/useBannerStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BannerState {
  dismissedIds: string[];
  dismiss: (id: string) => void;
}

export const useBannerStore = create<BannerState>()(
  persist(
    (set) => ({
      dismissedIds: [],
      dismiss: (id) =>
        set((s) => ({
          dismissedIds: [...new Set([...s.dismissedIds, id])],
        })),
    }),
    { name: "dismissed-banners" }
  )
);


export type BannerType = "sale" | "welcome" | "announcement";

export interface Banner {
  id: string;
  type: BannerType;
  priority: number;
  persistent: boolean; // save dismissal or not
}