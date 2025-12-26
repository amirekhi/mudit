// hooks/useBanners.ts

import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { Banner, useBannerStore } from "@/store/useTopBannerStore";

export function useBanners() {
  const { data: user, isLoading } = useCurrentUser();
  const dismissedIds = useBannerStore((s) => s.dismissedIds);

  if (isLoading) return [];

  const banners: Banner[] = [];

  // Sale banner
  banners.push({
    id: "holiday-sale-2025",
    type: "sale",
    priority: 1,
    persistent: true,
  });

  // New user banner
  if (!user) {
    banners.push({
      id: "welcome-guest",
      type: "welcome",
      priority: 2,
      persistent: true,
    });
  }

  return banners
    .filter((b) => !dismissedIds.includes(b.id))
    .sort((a, b) => a.priority - b.priority);
}
