"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { cn } from "@/lib/utils";
import styles from "./delta-ghost.module.css";

/**
 * Magnitude memory for a bar (research/morphing-interfaces-2026-10-04, M4). When a value drops, the part it lost stays
 * as a pale ghost for a moment and then drains toward the new end; when it rises, the part it gained arrives lit and
 * cools. You see how much changed, not only the new value. The ghost always spans two real values (before and after),
 * never an invented in-between. A run of changes the same way extends one ghost; a reversal starts a new one. With
 * reduced motion the ghost is shown still for the same moment and then removed, so the information stays.
 */
export interface Ghost {
  /** Fractions of the track (0–1): where the bar was and where it is now. */
  from: number;
  to: number;
  /** Increments per change, to restart the CSS animation. */
  key: number;
}

export function useDeltaGhost(value: number | null | undefined) {
  const before = useRef(value);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  useLayoutEffect(() => {
    const was = before.current;
    before.current = value;
    if (was == null || value == null || !Number.isFinite(was) || !Number.isFinite(value) || was === value) return;
    setGhost((g) => {
      const sameWay = g && Math.sign(g.to - g.from) === Math.sign(value - was) && g.to === was;
      return { from: sameWay ? g.from : was, to: value, key: (g?.key ?? 0) + 1 };
    });
  }, [value]);
  const clear = useCallback(() => setGhost(null), []);
  return [ghost, clear] as const;
}

/** The ghost itself, absolutely placed in a relative, clipped track. `color` is the fill's colour. */
export function DeltaGhost({
  ghost,
  onDone,
  color,
  className,
}: {
  ghost: Ghost | null;
  onDone: () => void;
  color?: string;
  className?: string;
}) {
  const reduced = useReducedMotionSafe();
  if (!ghost) return null;
  const lo = Math.max(0, Math.min(1, Math.min(ghost.from, ghost.to)));
  const hi = Math.max(0, Math.min(1, Math.max(ghost.from, ghost.to)));
  if (hi - lo < 0.002) return null;
  return (
    <span
      key={ghost.key}
      aria-hidden
      data-slot="delta-ghost"
      data-kind={ghost.to < ghost.from ? "loss" : "gain"}
      data-reduced={reduced ? "" : undefined}
      className={cn(styles.ghost, className)}
      style={{ "--g-lo": lo, "--g-hi": hi, ...(color ? { "--g-color": color } : {}) } as CSSProperties}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onDone();
      }}
    />
  );
}
