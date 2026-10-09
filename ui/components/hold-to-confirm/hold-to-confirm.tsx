"use client";

import { type Ref } from "react";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useMotionTokens } from "@/hooks/use-motion-tokens";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";

import { useComponentDefaults } from "@/runtime/appearance";
import type { HoldToConfirmDefaults } from "./defaults";
export type { HoldToConfirmDefaults } from "./defaults";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { buttonClassName, type ButtonSize } from "@/components/button/button";
import { cn } from "@/lib/utils";
import styles from "./hold-to-confirm.module.css";

export interface HoldToConfirmClassNames {
  root?: string;
  fill?: string;
  content?: string;
  hint?: string;
}

export interface HoldToConfirmProps {
  /** Say the hold: "Hold to delete workspace". */
  label: string;
  /** Shown once confirmed. Default "Done". */
  confirmedLabel?: string;
  onConfirm: () => void;
  /** How long to hold, ms. Default 1200. */
  duration?: number;
  icon?: ReactNode;
  tone?: "danger" | "neutral";
  /** Confirmed state, controlled; uncontrolled it stays confirmed after the hold. */
  confirmed?: boolean;
  onHoldChange?: (holding: boolean) => void;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  classNames?: HoldToConfirmClassNames;
  ref?: Ref<HTMLButtonElement>;
  style?: CSSProperties;
}

/**
 * Confirms a costly action by holding instead of clicking: a fill sweeps across while held and drains if let go
 * early. Pointer, touch, Space and Enter all hold. Use it where a dialog would interrupt but a click is too cheap.
 */
export function HoldToConfirm({
  label,
  confirmedLabel = "Done",
  onConfirm,
  duration = 1200,
  icon,
  tone: toneProp,
  confirmed: confirmedProp,
  onHoldChange,
  size: sizeProp,
  disabled,
  className,
  classNames,
  ref,
  style,
}: HoldToConfirmProps) {
  const scopeDefaults = useComponentDefaults<HoldToConfirmDefaults>("hold-to-confirm", ["tone", "size"]);
  const tone = toneProp ?? scopeDefaults.tone ?? "danger";
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  const [inner, setInner] = useState(false);
  const confirmed = confirmedProp ?? inner;
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hint = useId();
  const host = useRef<HTMLButtonElement>(null);
  const attach = useComposedRef(host, ref);
  const tokens = useMotionTokens(host);
  const managedReduced = useReducedMotionSafe();
  const reduced = tokens.reduced || managedReduced;
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (confirmedProp === false) setInner(false);
  }, [confirmedProp]);

  const begin = () => {
    if (confirmed || disabled || pressed) return;
    setPressed(true);
    onHoldChange?.(true);
    timer.current = setTimeout(() => {
      setPressed(false);
      onHoldChange?.(false);
      setInner(true);
      navigator.vibrate?.(12);
      onConfirm();
    }, duration);
  };
  const stop = () => {
    if (!pressed) return;
    clearTimeout(timer.current);
    setPressed(false);
    onHoldChange?.(false);
  };

  return (
    <button
      type="button"
      ref={attach}
      style={style}
      data-slot="hold-to-confirm"
      data-tone={tone}
      data-state={confirmed ? "confirmed" : pressed ? "holding" : "idle"}
      disabled={disabled}
      aria-describedby={confirmed ? undefined : hint}
      className={cn(
        buttonClassName({ variant: tone === "danger" ? "danger" : "secondary", size }),
        "touch-none overflow-hidden",
        confirmed && "cursor-default",
        classNames?.root,
        className,
      )}
      onPointerDown={(e) => {
        if (e.button === 0) {
          e.currentTarget.setPointerCapture(e.pointerId);
          begin();
        }
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span
        aria-hidden
        data-slot="hold-to-confirm-fill"
        className={cn(styles.fill, classNames?.fill)}
        style={{ "--_hold": `${duration}ms` } as CSSProperties}
      />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={confirmed ? "done" : "hold"}
          data-slot="hold-to-confirm-content"
          className={cn("inline-flex items-center gap-1.5", classNames?.content)}
          initial={{ opacity: 0, y: reduced ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -6 }}
          transition={{ duration: reduced ? 0 : tokens.duration.out }}
        >
          {confirmed ? <Check /> : icon}
          {confirmed ? confirmedLabel : label}
        </motion.span>
      </AnimatePresence>
      <span id={hint} data-slot="hold-to-confirm-hint" className={cn("sr-only", classNames?.hint)}>
        Press and hold for {Math.round(duration / 100) / 10} seconds to confirm.
      </span>
    </button>
  );
}

export default HoldToConfirm;
