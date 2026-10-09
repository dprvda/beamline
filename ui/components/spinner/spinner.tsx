"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { SpinnerDefaults } from "./defaults";
export type { SpinnerDefaults } from "./defaults";

import { useRef, type CSSProperties, type Ref } from "react";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useActive } from "@/hooks/use-active";
import { useMotionTokens } from "@/hooks/use-motion-tokens";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { cn } from "@/lib/utils";
import styles from "./spinner.module.css";

export interface SpinnerClassNames {
  root?: string;
  svg?: string;
  track?: string;
  arc?: string;
  mark?: string;
}

export interface SpinnerProps {
  /** `success` draws a check out of the ring, `error` a cross; both stop spinning. */
  state?: "loading" | "success" | "error";
  size?: "sm" | "md" | "lg";
  /** Accessible name while loading. */
  label?: string;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
  style?: CSSProperties;
  classNames?: SpinnerClassNames;
}

/** Icon box from the foundation icon steps (§14.2): sm 14, md 16, lg 20. */
const PX = { sm: "var(--pui-icon-sm)", md: "var(--pui-icon-md)", lg: "var(--pui-icon-lg)" } as const;

/**
 * A ring that spins while work runs and closes into a drawn check (or cross) when it ends — the result is a shape as
 * well as a colour. With reduced motion the loading ring holds still.
 */
export function Spinner({
  state = "loading",
  size: sizeProp,
  label = "Loading",
  className,
  classNames,
  style,
  ref,
}: SpinnerProps) {
  const scopeDefaults = useComponentDefaults<SpinnerDefaults>("spinner", ["size"]);
  const size = sizeProp ?? scopeDefaults.size ?? "md";
  const host = useRef<HTMLSpanElement>(null);
  const attach = useComposedRef(host, ref);
  const active = useActive(host);
  const tokens = useMotionTokens(host);
  const managedReduced = useReducedMotionSafe();
  const reduced = tokens.reduced || managedReduced;

  const box = PX[size];
  const done = state !== "loading";
  const tone = state === "success" ? "text-green" : state === "error" ? "text-red" : "text-ink-2";
  return (
    <span
      ref={attach}
      data-slot="spinner"
      data-state={state}
      role={done ? "img" : "status"}
      aria-label={state === "success" ? "Done" : state === "error" ? "Failed" : label}
      className={cn("relative inline-grid shrink-0 place-items-center", tone, classNames?.root, className)}
      style={{ width: box, height: box, ...style }}
    >
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        fill="none"
        aria-hidden="true"
        data-state={state}
        data-slot="spinner-svg"
        data-reduced={reduced ? "" : undefined}
        data-paused={active ? undefined : ""}
        className={cn(styles.svg, classNames?.svg)}
      >
        <circle
          data-slot="spinner-track"
          className={cn(styles.track, classNames?.track)}
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle
          data-slot="spinner-arc"
          className={cn(styles.arc, classNames?.arc)}
          cx="12"
          cy="12"
          r="9.5"
          pathLength={1}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
        {state === "success" && (
          <path
            data-slot="spinner-mark"
            className={cn(styles.mark, classNames?.mark)}
            d="M7.5 12.5l3 3 6-6.5"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {state === "error" && (
          <path
            data-slot="spinner-mark"
            className={cn(styles.mark, classNames?.mark)}
            d="M8.5 8.5l7 7M15.5 8.5l-7 7"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </span>
  );
}

export default Spinner;
