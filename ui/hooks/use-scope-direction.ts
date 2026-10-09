"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { useDirection } from "@radix-ui/react-direction";
import { useAppearance, useAppearanceRoot } from "@/runtime/appearance";
import { APPEARANCE_EVENT } from "@/lib/motion-tokens";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Preserve Radix direction in managed scopes and read the actual parent in static scopes before Radix stamps dir. */
export function useScopeDirection<T extends HTMLElement>(ref?: Ref<T>, explicit?: "ltr" | "rtl") {
  const root = useRef<T | null>(null);
  const provided = useDirection(explicit);
  const appearance = useAppearance();
  const managedRoot = useAppearanceRoot();
  const [inherited, setInherited] = useState<"ltr" | "rtl">();
  const read = useCallback(() => {
    const around = root.current?.parentElement;
    if (around)
      setInherited(around.ownerDocument.defaultView?.getComputedStyle(around).direction === "rtl" ? "rtl" : "ltr");
  }, []);
  useIsoLayoutEffect(read, [read, provided, appearance]);
  useEffect(() => {
    const doc = root.current?.ownerDocument;
    doc?.addEventListener(APPEARANCE_EVENT, read);
    return () => doc?.removeEventListener(APPEARANCE_EVENT, read);
  }, [read]);
  const attach = useCallback(
    (node: T | null) => {
      root.current = node;
      if (typeof ref === "function") {
        const cleanup = ref(node);
        if (typeof cleanup === "function")
          return () => {
            root.current = null;
            cleanup();
          };
      } else if (ref) ref.current = node;
    },
    [ref],
  );
  return [
    attach,
    explicit ?? (managedRoot ? provided : provided === "rtl" ? provided : (inherited ?? provided)),
  ] as const;
}
