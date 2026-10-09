"use client";

import { useSyncExternalStore } from "react";

/** True while the media query matches; false on the server and in the first client render of SSR output. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", notify);
      return () => m.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phone-width layouts: below 768px. */
export const usePhone = () => useMediaQuery("(max-width: 767px)");
