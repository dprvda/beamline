"use client";

import { useRef } from "react";
import { useAppearanceRoot } from "@/runtime/appearance";

/**
 * Where focus goes when a modal layer closes. Radix returns it to its own Trigger; a layer opened another way (a
 * controlled `open`, a menu item, a shortcut) would drop focus on <body>. Spread the result on the Radix content: it
 * remembers what had focus as the layer opened and returns there, unless the caller's own handler prevents it.
 * If that opener is removed, return to its surviving owning region, or the managed scope's visual root.
 */
export function useReturnFocus({
  onOpenAutoFocus,
  onCloseAutoFocus,
}: { onOpenAutoFocus?: (event: Event) => void; onCloseAutoFocus?: (event: Event) => void } = {}) {
  const before = useRef<HTMLElement | null>(null);
  const regions = useRef<HTMLElement[]>([]);
  const scope = useAppearanceRoot();
  return {
    onOpenAutoFocus: (event: Event) => {
      before.current = document.activeElement as HTMLElement | null;
      const owners: HTMLElement[] = [];
      let ancestor = before.current;
      while (ancestor) {
        if (ancestor !== document.body && ancestor.matches("[data-return-region]")) owners.push(ancestor);
        ancestor = ancestor.parentElement;
      }
      const root = scope ?? before.current?.closest<HTMLElement>(".pui");
      if (root && root !== document.body && !owners.includes(root)) owners.push(root);
      regions.current = owners;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      const el = before.current;
      if (el && el !== document.body && el.isConnected) {
        event.preventDefault();
        el.focus({ preventScroll: true });
        return;
      }
      const region = regions.current.find((owner) => owner.isConnected);
      if (region) {
        event.preventDefault();
        // Regions need not be tab stops, but they must receive programmatic return focus.
        if (!region.hasAttribute("tabindex")) region.tabIndex = -1;
        region.focus({ preventScroll: true });
      }
    },
  };
}
