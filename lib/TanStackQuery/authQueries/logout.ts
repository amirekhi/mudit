import { queryClient } from "@/lib/TanStackQuery/queryClient";

export async function logout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  queryClient.setQueryData(["current-user"], {
    loggedIn: false,
  });
}
