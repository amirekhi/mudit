
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { useTopBannerStore } from "@/store/useTopBannerStore";

export function useTopBanner() {
  const { data: user, isLoading } = useCurrentUser();
  const dismissed = useTopBannerStore((s) => s.dismissed);

  if (isLoading || dismissed) {
    return { type: null };
  }

  // Example: hardcoded sale for now
  const hasActiveSale = true;

  if (hasActiveSale) {
    return { type: "sale" as const };
  }

  if (!user) {
    return { type: "welcome" as const };
  }

  return { type: null };
}
