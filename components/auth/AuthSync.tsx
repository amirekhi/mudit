"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";

// Mount once inside <QueryProvider>. When the signed-in Clerk user changes
// (login, logout, account switch) every cached query is reset, so one person's
// private data can never show up under another account.
export default function AuthSync() {
  const { userId, isLoaded } = useAuth();
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const current = userId ?? null;
    if (previous.current !== undefined && previous.current !== current) {
      queryClient.resetQueries();
    }
    previous.current = current;
  }, [userId, isLoaded, queryClient]);

  return null;
}
