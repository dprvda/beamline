"use client";

import { APPEARANCE_EVENT } from "@/lib/motion-tokens";
import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

export interface IndicatorBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** False on the first placement, so the indicator appears in place instead of sliding in from the corner. */
  ready: boolean;
  /** Which way the last move went on each axis (-1 left or up, 1 right or down, 0 still), for the edge that leads. */
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
  /** choice: a selection changed; layout: the same choice moved because the page reflowed (a resize, a font, a
   *  type scale). A surface may travel for a choice and should simply be there after a reflow. */
  cause: "choice" | "layout";
}

type Box = Pick<IndicatorBox, "x" | "y" | "w" | "h">;
const same = (a: IndicatorBox | null, b: Box) => a !== null && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/**
 * Follows the chosen item inside a container: the thumb of a segmented control, the pill or line of tabs, the ring of
 * radio cards. Returns a ref for the container and the box of the first element matching `selector` in it, relative
 * to the container (null when nothing matches). It measures before paint whenever `key` changes, and again when the
 * container resizes or a selection attribute changes inside it (for parts whose choice lives in a library, like tabs).
 */
export function useIndicator<T extends HTMLElement>(
  selector: string,
  key?: unknown,
  onPlace?: (item: HTMLElement, container: T) => void,
  /** offset (default): the item's offset box, for items whose offset parent is the container. rect: measured on screen
   *  relative to the container, for items nested in positioned cells (a calendar day in its table cell). */
  measure: "offset" | "rect" = "offset",
): [RefObject<T | null>, IndicatorBox | null] {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<IndicatorBox | null>(null);
  const placed = useRef(onPlace);
  useLayoutEffect(() => {
    placed.current = onPlace;
  });
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const place = (cause: IndicatorBox["cause"] = "choice") => {
      const item = container.querySelector<HTMLElement>(selector);
      if (!item) {
        setBox(null);
        return;
      }
      let next = { x: item.offsetLeft, y: item.offsetTop, w: item.offsetWidth, h: item.offsetHeight };
      if (measure === "rect") {
        const a = item.getBoundingClientRect();
        const c = container.getBoundingClientRect();
        next = {
          x: Math.round(a.left - c.left - container.clientLeft + container.scrollLeft),
          y: Math.round(a.top - c.top - container.clientTop + container.scrollTop),
          w: item.offsetWidth,
          h: item.offsetHeight,
        };
      }
      setBox((b) =>
        same(b, next)
          ? b
          : {
              ...next,
              cause,
              ready: b !== null,
              dx: b ? (Math.sign(next.x - b.x) as IndicatorBox["dx"]) : 0,
              dy: b ? (Math.sign(next.y - b.y) as IndicatorBox["dy"]) : 0,
            },
      );
      placed.current?.(item, container);
    };
    const resizes = new ResizeObserver(() => place("layout"));
    resizes.observe(container);
    const observed = new Set<Element>();
    const observeItems = () => {
      // A full-width fixed-height list can stay the same size while its tabs/radio choices grow with type or labels.
      // Ignore the decorative indicator itself, whose own dimensions are the output of this measurement.
      const items = new Set([...container.children].filter((child) => child.getAttribute("aria-hidden") !== "true"));
      for (const old of observed)
        if (!items.has(old)) {
          resizes.unobserve(old);
          observed.delete(old);
        }
      for (const item of items)
        if (!observed.has(item)) {
          resizes.observe(item);
          observed.add(item);
        }
    };
    observeItems();
    place();
    const mutations = new MutationObserver(() => {
      observeItems();
      place("choice");
    });
    mutations.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-checked", "aria-selected", "aria-current", "data-active", "data-open"],
    });
    const reflow = () => place("layout");
    container.ownerDocument.addEventListener(APPEARANCE_EVENT, reflow);
    container.ownerDocument.fonts?.addEventListener("loadingdone", reflow);
    return () => {
      mutations.disconnect();
      resizes.disconnect();
      container.ownerDocument.removeEventListener(APPEARANCE_EVENT, reflow);
      container.ownerDocument.fonts?.removeEventListener("loadingdone", reflow);
    };
  }, [selector, key, measure]);
  return [ref, box];
}

/** The box as custom properties, for a stylesheet to place the indicator with: --pui-indicator-x/-y/-w/-h, and its
 *  four edges --pui-glide-l/-r/-t/-b, which the `glide` class moves one at a time. */
export function indicatorStyle(box: IndicatorBox): CSSProperties {
  return {
    "--pui-indicator-x": `${box.x}px`,
    "--pui-indicator-y": `${box.y}px`,
    "--pui-indicator-w": `${box.w}px`,
    "--pui-indicator-h": `${box.h}px`,
    "--pui-glide-l": `${box.x}px`,
    "--pui-glide-r": `${box.x + box.w}px`,
    "--pui-glide-t": `${box.y}px`,
    "--pui-glide-b": `${box.y + box.h}px`,
  } as CSSProperties;
}

const AXIS = { x: ["left", undefined, "right"], y: ["up", undefined, "down"] } as const;

/** Everything an indicator wearing the `glide` class needs (utilities.css): its place, whether it may move yet, and
 *  which way it is going, so the edge on that side leads and the other follows: it stretches toward the new choice and
 *  gathers there. */
export function glideProps(box: IndicatorBox) {
  return {
    style: indicatorStyle(box),
    "data-ready": box.ready ? "" : undefined,
    "data-glide-x": AXIS.x[box.dx + 1],
    "data-glide-y": AXIS.y[box.dy + 1],
  };
}
