"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { createContour, type Contour } from "@/lib/contour";
import type { IndicatorBox } from "./use-indicator";

/**
 * Puts a decorative surface (a segmented thumb, a tab's pill or line) on the contour engine and moves it to `box`
 * whenever the box changes: the first placement is instant, later ones travel as matter (ui/lib/contour.ts). Returns a
 * ref for the surface. The surface stays aria-hidden; the control's own state has already changed by the time it moves.
 */
export function useContour<T extends HTMLElement>(box: IndicatorBox | null) {
  const contour = useRef<Contour | null>(null);
  const ref = useCallback((el: T | null) => {
    contour.current?.destroy();
    contour.current = el ? createContour(el) : null;
  }, []);
  useLayoutEffect(() => {
    // a choice travels; the first placement and a reflow of the same choice are simply there
    if (box) contour.current?.to(box, { instant: !box.ready || box.cause === "layout" });
  }, [box]);
  return ref;
}
