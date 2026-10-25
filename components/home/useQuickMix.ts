"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { quickMix } from "@/lib/TanStackQuery/Queries/tastes";
import { FOR_YOU_KEY } from "@/lib/TanStackQuery/Queries/forYou";
import { playlistPath } from "@/lib/recs/links";
import type { PeriodKind } from "@/lib/recs/periods";

/**
 * Builds today's / this week's / this month's mix for a taste, then opens the
 * playlist so it can be played right away.
 */
export function useQuickMix(onOpen?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ tasteId: string; period: PeriodKind } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (tasteId: string, period: PeriodKind) => {
    if (pending) return;
    setPending({ tasteId, period });
    setError(null);
    try {
      const result = await quickMix(tasteId, period);
      queryClient.invalidateQueries({ queryKey: FOR_YOU_KEY });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["tastes"] });
      onOpen?.();
      router.push(playlistPath(result.playlistId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't make that mix");
    } finally {
      setPending(null);
    }
  };

  return { run, pending, error, clearError: () => setError(null) };
}