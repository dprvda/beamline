"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { useMotionTokens } from "@/hooks/use-motion-tokens";
import type { MotionEase } from "@/lib/motion-tokens";

const curve = (ease: MotionEase) => (Array.isArray(ease) ? `cubic-bezier(${ease.join(",")})` : "ease-out");
type Seen = { el: HTMLElement; x: number; y: number; w: number; h: number };

/**
 * Items of a collection keep their path (the morph grammar's "changes keep their size and their path"): mark each item
 * with `data-flip="<stable key>"` inside `container`. After a change, an item that is new grows in, items that moved
 * slide from where they were, and an item that left fades out as a ghost where it stood (a still copy, inert and
 * hidden from assistive tech, removed when it has faded). The data and focus change at once; only the picture
 * settles. Nothing runs at rest; reduced motion places at once. Positions are kept relative to the container, so a
 * scroll of the page never reads as movement.
 */
export function useFlip(
  container: RefObject<HTMLElement | null> | (() => HTMLElement | null),
  { ghost = true, enter = true }: { ghost?: boolean; enter?: boolean } = {},
) {
  const get = typeof container === "function" ? container : () => container.current;
  // timing read at the container itself, found when the commit has attached it (a function container has no ref of its
  // own; without a host the timing stayed unresolved where no UIRoot is around, then rendered again to say so)
  const host =
    typeof container === "function"
      ? {
          get current() {
            return container();
          },
        }
      : container;
  const motion = useMotionTokens(host);
  const last = useRef<Map<string, Seen> | null>(null);
  // every render on purpose: a collection changes through its parent's state, not through anything we can depend on
  useLayoutEffect(() => {
    const root = get();
    if (!root) return;
    const box = root.getBoundingClientRect();
    const now = new Map<string, Seen>();
    for (const el of root.querySelectorAll<HTMLElement>("[data-flip]")) {
      if (el.parentElement?.closest("[data-flip]")) continue; // only the outermost items move
      const r = el.getBoundingClientRect();
      now.set(el.dataset.flip!, { el, x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height });
    }
    const before = last.current;
    last.current = now;
    const ms = motion.duration.standard * 1000;
    if (!before || motion.reduced || ms < 2) return;
    const easing = curve(motion.ease.standard);
    for (const [key, at] of now) {
      const was = before.get(key);
      if (!was) {
        if (enter)
          at.el.animate(
            [
              { opacity: 0, transform: "scale(0.86)" },
              { opacity: 1, transform: "none" },
            ],
            {
              duration: ms,
              easing,
            },
          );
        continue;
      }
      const dx = was.x - at.x,
        dy = was.y - at.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)
        at.el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: ms, easing });
    }
    if (!ghost) return;
    for (const [key, was] of before) {
      if (now.has(key) || was.el.isConnected) continue;
      const copy = was.el.cloneNode(true) as HTMLElement;
      copy.removeAttribute("data-flip");
      copy.removeAttribute("id");
      copy.setAttribute("aria-hidden", "true");
      copy.inert = true;
      if (getComputedStyle(root).position === "static") root.style.position = "relative";
      Object.assign(copy.style, {
        position: "absolute",
        left: `${was.x + root.scrollLeft}px`,
        top: `${was.y + root.scrollTop}px`,
        width: `${was.w}px`,
        height: `${was.h}px`,
        margin: "0",
        pointerEvents: "none",
      });
      root.appendChild(copy);
      // the ghost is gone by the time a neighbour slides into its place, so their texts never mix
      const fade = copy.animate(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "scale(0.9)", offset: 0.45 },
          { opacity: 0, transform: "scale(0.86)" },
        ],
        {
          duration: motion.duration.standard * 1000,
          easing,
        },
      );
      const drop = () => copy.remove();
      fade.finished.then(drop, drop);
    }
  });
}
