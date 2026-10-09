"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { CopyButtonDefaults } from "./defaults";
export type { CopyButtonDefaults } from "./defaults";

import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { Check, Copy, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/button/button";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useMotionTokens } from "@/hooks/use-motion-tokens";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

export interface CopyButtonClassNames {
  root?: string;
  label?: string;
  loader?: string;
  iconFrame?: string;
  icon?: string;
  status?: string;
}

export interface CopyButtonProps {
  /** The text that lands on the clipboard. */
  value: string;
  /** What is copied, e.g. "Copy API key"; the accessible name when icon-only. Default "Copy". */
  label?: string;
  iconOnly?: boolean;
  /** Any Button variant; "plain" is kept as an alias of ghost. Default secondary. */
  variant?: ButtonVariant | "plain";
  size?: ButtonSize;
  disabled?: boolean;
  /** Runs after a successful copy. */
  onCopied?: () => void;
  /** How long "Copied" stays, ms. Default 1600. */
  timeout?: number;
  className?: string;
  classNames?: CopyButtonClassNames;
  style?: CSSProperties;
  ref?: Ref<HTMLButtonElement>;
}

const ICONS = { idle: Copy, copied: Check, failed: X } as const;

/**
 * Copies a value and confirms in place: the icon turns into a check and the label into "Copied" for a moment, and a
 * screen reader hears it. If the browser refuses, it says so instead of pretending.
 */
export function CopyButton({
  value,
  label = "Copy",
  iconOnly = false,
  variant: variantProp,
  size: sizeProp,
  disabled,
  onCopied,
  timeout = 1600,
  className,
  classNames,
  style,
  ref,
}: CopyButtonProps) {
  const scopeDefaults = useComponentDefaults<CopyButtonDefaults>("copy-button", ["variant", "size"]);
  const variant = variantProp ?? scopeDefaults.variant ?? "secondary";
  const size = sizeProp ?? scopeDefaults.size ?? "sm";

  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const host = useRef<HTMLButtonElement>(null);
  const attach = useComposedRef(host, ref);
  const tokens = useMotionTokens(host);
  const managedReduced = useReducedMotionSafe();
  const reduced = tokens.reduced || managedReduced;
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = async () => {
    const ok = await copyText(value);
    setState(ok ? "copied" : "failed");
    if (ok) onCopied?.();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), ok ? timeout : timeout + 1200);
  };
  const Icon = ICONS[state];
  const text = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label;
  return (
    <Button
      ref={attach}
      style={style}
      classNames={classNames}
      data-slot="copy-button"
      data-state={state}
      variant={variant === "plain" ? "ghost" : variant}
      size={size}
      disabled={disabled}
      onClick={run}
      aria-label={iconOnly ? text : undefined}
      className={cn(state === "copied" && "[&_svg]:text-green", state === "failed" && "[&_svg]:text-red", className)}
    >
      <span
        data-slot="copy-button-icon-frame"
        className={cn("relative grid size-4 place-items-center", classNames?.iconFrame)}
        aria-hidden
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            data-slot="copy-button-icon"
            className={cn("grid place-items-center", classNames?.icon)}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(2px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(2px)" }}
            transition={{ duration: reduced ? 0 : tokens.duration.feedback }}
          >
            <Icon className="size-4" />
          </motion.span>
        </AnimatePresence>
      </span>
      {!iconOnly && text}
      <span data-slot="copy-button-status" className={cn("sr-only", classNames?.status)} role="status">
        {state === "copied"
          ? "Copied to clipboard"
          : state === "failed"
            ? "Could not copy; select the text and copy it yourself"
            : ""}
      </span>
    </Button>
  );
}

export default CopyButton;
