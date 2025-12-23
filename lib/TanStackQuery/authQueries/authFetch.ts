// lib/auth/authFetch.ts
import { queryClient } from "@/lib/TanStackQuery/queryClient";

export async function authFetch(
  input: RequestInfo,
  init?: RequestInit
) {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
  });

  if (res.status === 401) {
    queryClient.setQueryData(["current-user"], null);
  }

  return res;
}
