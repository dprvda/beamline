"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useScopeMotion } from "@/runtime/appearance";

/** Managed motion policy plus the OS preference, with a stable server snapshot. */
export function useReducedMotionSafe() {
  const requested = useScopeMotion();
  const os = useMediaQuery("(prefers-reduced-motion: reduce)");
  return requested !== "auto" || os;
}
