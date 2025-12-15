import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, CurrentUser } from "../getCurentUser";

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    staleTime: Infinity, // data stays fresh indefinitely
    gcTime: Infinity,    // prevents garbage collection
  });
}
