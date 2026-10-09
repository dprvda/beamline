"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Whether an animated element should be doing work: it is (nearly) on screen and the tab is visible. Every
 * continuously animated component gates its loop, shader or CSS animation on this, so an effect scrolled out of view,
 * behind another tab, or in a collapsed panel costs nothing. One IntersectionObserver per element; no polling.
 */
export function useActive(
  ref: RefObject<Element | null>,
  {
    margin = "120px",
    key,
  }: { margin?: string; /** Re-attach when this changes (an element that mounts later). */ key?: unknown } = {},
) {
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, key]);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return inView && visible;
}
