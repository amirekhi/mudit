import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { useBannerStore } from "@/store/useTopBannerStore";

export function useTopBanner() {
  const { data: user, isLoading } = useCurrentUser();
  const dismissedIds = useBannerStore((s) => s.dismissedIds);

  const SALE_BANNER_ID = "sale-2026";

  if (isLoading || dismissedIds.includes(SALE_BANNER_ID)) {
    return { type: null };
  }

  const hasActiveSale = true;

  if (hasActiveSale) {
    return { type: "sale" as const };
  }

  if (!user) {
    return { type: "welcome" as const };
  }

  return { type: null };
}