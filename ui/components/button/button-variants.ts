import { cn } from "@/lib/utils";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
/** sm 32 · md 36 · lg 40 · touch 44 (a bottom action bar on a phone). */
export type ButtonSize = "sm" | "md" | "lg" | "touch";
/** Market side: buy fills with --pui-up, sell with --pui-down (a red-up market flips the two tokens, not the code). */
export type ButtonTone = "up" | "down";

/** Which paint role paints each variant: filled variants are solids, the quiet ones keep their own light paint. */
const ROLE: Record<ButtonVariant, string | undefined> = {
  primary: "m-solid",
  accent: "m-solid",
  secondary: "m-control",
  outline: undefined,
  ghost: undefined,
  danger: undefined,
};

/** A variant's paint without the button's layout, for a group that wears one button's look (SplitButton paints the
 *  pair as one button and leaves its halves transparent). */
export function buttonPaint(variant: ButtonVariant = "primary", tone?: ButtonTone) {
  return cn(ROLE[variant], styles[variant], tone && styles[tone]);
}

/** The classes that make any element look like a Button, for parts that render their own element. */
export function buttonClassName({
  variant = "primary",
  size = "md",
  tone,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; tone?: ButtonTone; className?: string } = {}) {
  return cn(styles.root, ROLE[variant], styles[variant], tone && styles[tone], styles[size], className);
}
