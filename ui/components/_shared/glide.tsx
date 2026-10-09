"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import overlay from "./overlay.module.css";

/**
 * The gliding highlight for a list whose active row is tracked in state (command menu, listbox): one plate travels to
 * the active row for the arrow keys and the pointer alike, over --pui-duration-fast. It appears in place (no travel)
 * the first time and whenever `reset` changes (a new page or a new query), so typing never sends it flying.
 * The list must be the plate's offset parent (position: relative); rows stay above it (overlay.item is z-index 1).
 */
export function GlidePlate({
  list,
  selector,
  reset,
  axis = "y",
  className,
}: {
  list: RefObject<HTMLElement | null>;
  /** Finds the active row inside `list`; null when nothing is active. */
  selector: string | null;
  reset?: unknown;
  /** "y" for a list (the plate spans the width); "xy" for a row or grid of cells (it takes each cell's size). */
  axis?: "y" | "xy";
  className?: string;
}) {
  const [plate, setPlate] = useState<{ x: number; y: number; w: number; h: number; jump: boolean } | null>(null);
  const lastReset = useRef(reset);
  const self = useRef<HTMLSpanElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- every render on purpose; setPlate bails out when unchanged
  useLayoutEffect(() => {
    // the list holds the plate, and React attaches a parent's ref only after its children's layout effects: on the
    // first commit the list is the plate's own parent (it placed itself only when something rendered again later)
    const host = list.current ?? self.current?.parentElement;
    const row = selector ? host?.querySelector<HTMLElement>(selector) : null;
    const fresh = lastReset.current !== reset;
    lastReset.current = reset;
    if (!row) {
      setPlate((p) => (p && p.h ? { ...p, h: 0 } : p));
      return;
    }
    const x = row.offsetLeft,
      y = row.offsetTop,
      w = row.offsetWidth,
      h = row.offsetHeight;
    setPlate((p) =>
      p && p.x === x && p.y === y && p.w === w && p.h === h && !fresh ? p : { x, y, w, h, jump: fresh || !p?.h },
    );
    // every render: rows can arrive or change height without the selector changing; an unchanged place keeps the state
  });
  return (
    <span
      ref={self}
      aria-hidden
      data-slot="list-highlight"
      className={cn(overlay.glide, className)}
      data-on={plate?.h ? "" : undefined}
      data-jump={plate?.jump ? "" : undefined}
      data-axis={axis}
      style={
        !plate
          ? undefined
          : axis === "y"
            ? { transform: `translateY(${plate.y}px)`, height: plate.h || undefined }
            : { transform: `translate(${plate.x}px, ${plate.y}px)`, width: plate.w, height: plate.h || undefined }
      }
    />
  );
}

/**
 * A GlidePlate for lists whose highlight is the pointer or keyboard focus rather than state (time picker, plain option
 * lists): it follows the row under the pointer or holding focus, and fades when neither is in the list. Rows drop
 * their own hover and focus tint.
 */
export function FollowPlate({
  list,
  rows,
  className,
}: {
  list: RefObject<HTMLElement | null>;
  /** Matches a row inside `list`, e.g. "[role=option]". */
  rows: string;
  className?: string;
}) {
  const [hot, setHot] = useState<string | null>(null);
  // after the commit, when the list's ref is attached (a layout effect here ran before it and never listened)
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    let n = 0;
    const mark = (target: EventTarget | null) => {
      const row = (target as HTMLElement | null)?.closest?.<HTMLElement>(rows);
      if (!row || !el.contains(row)) return;
      row.dataset.glideKey ??= String(++n);
      setHot(row.dataset.glideKey);
    };
    const over = (e: Event) => mark(e.target);
    const leave = () => {
      if (!el.contains(document.activeElement)) setHot(null);
    };
    const blur = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node)) setHot(null);
    };
    el.addEventListener("pointerover", over);
    el.addEventListener("focusin", over);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focusout", blur);
    return () => {
      el.removeEventListener("pointerover", over);
      el.removeEventListener("focusin", over);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focusout", blur);
    };
  }, [list, rows]);
  return <GlidePlate list={list} selector={hot ? `[data-glide-key="${hot}"]` : null} className={className} />;
}
