"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. `serverDefault` is what the server render (and hydration)
 * uses, so there is no hydration mismatch; React re-renders with the real value afterwards.
 */
export function useMediaQuery(query: string, serverDefault = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault
  );
}

/** Tailwind's `md` breakpoint. */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)", true);
