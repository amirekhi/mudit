"use client";

import { useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";

// Replaces the old logout() function. It is a hook because Clerk's signOut comes from useClerk().
// Usage:  const logout = useLogout();   <button onClick={logout}>Log out</button>
export function useLogout() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  return async () => {
    queryClient.setQueryData(["current-user"], null);
    await signOut({ redirectUrl: "/login" });
    // AuthSync also resets the cache once the Clerk user changes.
  };
}
