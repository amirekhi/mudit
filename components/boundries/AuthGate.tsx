"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { CurrentUser } from "@/lib/TanStackQuery/authQueries/getCurentUser";


export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [verified, setVerified] = useState(false);

const { data: user, isLoading } = useQuery<CurrentUser | null>({
  queryKey: ["current-user-verification"],
  queryFn: async () => {
    try {
      const res = await authFetch("/api/auth/me");
      if (!res.ok) return null;
      const json = await res.json();

      // Sync verified user into global cache
      queryClient.setQueryData(["current-user"], json);
      return json;
    } catch {
      // Clear cache if unauthorized
      queryClient.setQueryData(["current-user"], null);
      return null;
    }
  },
  staleTime: 0,  // force server check
  gcTime: 0,   // don't cache this query itself
  retry: false,  // disable automatic retries
});

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  

useEffect(() => {
  if (!isLoading) setVerified(true);
}, [isLoading]);

if (!verified) return null; // block children until verified

  return <>{children}</>;
}
