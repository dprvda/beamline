"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { BadgeDefaults } from "./defaults";
export type { BadgeDefaults } from "./defaults";

import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import styles from "./badge.module.css";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
export type BadgeSize = "sm" | "md";

export interface BadgeClassNames {
  root?: string;
  dot?: string;
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic colour; pair it with a word or icon (colour is never the only signal). */
  tone?: BadgeTone;
  /** Height 20 / 22 px. */
  size?: BadgeSize;
  /** A leading icon element. */
  icon?: ReactNode;
  /** A leading status dot in the tone colour, instead of an icon. */
  dot?: boolean;
  ref?: Ref<HTMLSpanElement>;
  classNames?: BadgeClassNames;
}

/** A short label for status, category or count. No animation: it sits in dense tables and reads scoped presentation defaults. A look
 *  may outline it (pop makes it a sticker). */
export function Badge({
  tone: toneProp,
  size: sizeProp,
  icon,
  dot = false,
  className,
  classNames,
  children,
  ref,
  ...props
}: BadgeProps) {
  const scopeDefaults = useComponentDefaults<BadgeDefaults>("badge", ["tone", "size"]);
  const tone = toneProp ?? scopeDefaults.tone ?? "neutral";
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  return (
    <span
      ref={ref}
      data-slot="badge"
      data-tone={tone}
      {...props}
      className={cn(
        styles.root,
        size === "sm" && styles.sm,
        tone !== "neutral" && styles[tone],
        classNames?.root,
        className,
      )}
    >
      {dot && <span data-slot="badge-dot" aria-hidden className={cn(styles.dot, classNames?.dot)} />}
      {icon}
      {children}
    </span>
  );
}

export default Badge;
