import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* The type roles (utilities.css) and the 2xs step are sizes, not text colours: without this, tailwind-merge reads
   `text-overline` as a colour and drops it next to `text-ink-3`. A role and a size step still replace each other. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "2xs",
            "display",
            "title",
            "heading",
            "subheading",
            "body",
            "body-sm",
            "reading",
            "label",
            "caption",
            "overline",
            "numeric",
            "code",
          ],
        },
      ],
    },
  },
});

/** Merge class names, letting later Tailwind utilities win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A small seeded random generator (LCG): the same seed gives the same sequence, for stable sample data and jitter. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
