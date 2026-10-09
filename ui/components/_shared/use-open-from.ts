"use client";

import { useCallback, type Ref } from "react";

/**
 * A centred layer (dialog, alert dialog) that opens out of whatever opened it: as its content element attaches (each
 * time it opens, before the first frame and before focus moves in), the element that had focus (the button, row or
 * card that was used) is measured, and the layer starts as that box, offset back onto it, then grows to its own place
 * (overlay.module.css, `[data-open-from]`). The same values take it back there as it closes. Without a recent press
 * or Enter/Space (a shortcut, a controlled `open` from code) nothing is set and the ordinary entrance runs. Returns a ref
 * callback for the layer's content element, composed with the caller's `ref`.
 */
export function useOpenFrom<T extends HTMLElement>(external?: Ref<T>) {
  watch();
  return useCallback(
    (el: T | null) => {
      if (typeof external === "function") external(el);
      else if (external) external.current = el;
      if (el) measure(el);
    },
    [external],
  );
}

/** What was last pressed or keyed, noted as it happened: a field inside the new layer may take focus (autoFocus)
 *  before the layer can ask what had it. */
let last: { el: Element; at: number } | null = null;
let watching = false;
function watch() {
  if (watching || typeof document === "undefined") return;
  watching = true;
  const note = (e: Event) => {
    // a press, or Enter / Space on the focused control; a shortcut (⌘K) opens from nowhere in particular
    if (e.type === "keydown" && !["Enter", " "].includes((e as KeyboardEvent).key)) return;
    // the control that was pressed, not the label or icon inside it
    const target =
      e.type === "keydown"
        ? document.activeElement
        : ((e.target as Element | null)?.closest(
            "button, a[href], [role=button], [role=menuitem], [role=option], [role=tab], [role=row], input, select, textarea, [tabindex]",
          ) ?? (e.target as Element | null));
    if (target && target !== document.body) last = { el: target, at: performance.now() };
  };
  document.addEventListener("pointerdown", note, true);
  document.addEventListener("keydown", note, true);
}

function measure(el: HTMLElement) {
  // once per opening: a later call would measure the layer already moved onto its opener
  if (el.dataset.openFrom !== undefined) return;
  const doc = el.ownerDocument;
  // only a recent press or activation counts as the opener; a layer opened by a shortcut or by code has none
  const opener = (
    last && performance.now() - last.at < 1500 && last.el.isConnected ? last.el : null
  ) as HTMLElement | null;
  if (!opener || opener === doc.body || el.contains(opener)) return;
  const from = opener.getBoundingClientRect();
  // the layer's own resting box: its centre as laid out (an entrance scale does not move a centre) and its size
  // without transforms
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (!w || !h || !from.width || !from.height) return;
  const r = el.getBoundingClientRect();
  const left = r.left + r.width / 2 - w / 2;
  const top = r.top + r.height / 2 - h / 2;
  el.style.setProperty("--from-x", `${from.left - left}px`);
  el.style.setProperty("--from-y", `${from.top - top}px`);
  el.style.setProperty("--from-t", "0px");
  el.style.setProperty("--from-l", "0px");
  el.style.setProperty("--from-r", `${Math.max(0, w - from.width)}px`);
  el.style.setProperty("--from-b", `${Math.max(0, h - from.height)}px`);
  el.dataset.openFrom = "";
}
