"use client";

import { useCallback, type Ref, type RefObject } from "react";

/** Keep a control's measurement/focus ref and the caller's ref, including React 19 callback cleanup. */
export function useComposedRef<T>(internal: RefObject<T | null>, external?: Ref<T>) {
  return useCallback(
    (node: T | null) => {
      internal.current = node;
      if (typeof external === "function") {
        const cleanup = external(node);
        if (typeof cleanup === "function")
          return () => {
            internal.current = null;
            cleanup();
          };
      } else if (external) external.current = node;
    },
    [internal, external],
  );
}
