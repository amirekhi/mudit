// lib/auth/useCurrentUser.ts
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../getCurentUser";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
