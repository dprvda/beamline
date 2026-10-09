"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { BillingToggleDefaults } from "./defaults";
export type { BillingToggleDefaults } from "./defaults";

import type { CSSProperties, Ref, ReactNode } from "react";
import { SegmentedControl, type SegmentedControlClassNames } from "@/components/segmented-control/segmented-control";
import { cn } from "@/lib/utils";

export interface BillingToggleOption {
  value: string;
  label: string;
  /** A small note beside the label, e.g. "−20%". */
  badge?: ReactNode;
  /** The note while this period is chosen, e.g. "Saving 20%". */
  activeBadge?: ReactNode;
}

export type BillingToggleClassNames = SegmentedControlClassNames & { badge?: string };

export interface BillingToggleProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Default: Monthly, and Yearly with "−20%" / "Saving 20%". */
  options?: BillingToggleOption[];
  /** The group's name. Default "Billing period". */
  label?: string;
  size?: "md" | "lg";
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
  dir?: "ltr" | "rtl";
  classNames?: BillingToggleClassNames;
}

const DEFAULT: BillingToggleOption[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly", badge: "−20%", activeBadge: "Saving 20%" },
];

/** Monthly or yearly prices: a segmented control whose yearly note turns into what the choice saves. Pair it with
 *  prices that roll to the new amount (slot-text). */
export function BillingToggle({
  value,
  onValueChange,
  options = DEFAULT,
  label = "Billing period",
  size: sizeProp,
  className,
  style,
  ref,
  dir,
  classNames,
}: BillingToggleProps) {
  const scopeDefaults = useComponentDefaults<BillingToggleDefaults>("billing-toggle", ["size"]);
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  return (
    <SegmentedControl
      hideLabel
      style={style}
      ref={ref}
      dir={dir}
      classNames={classNames}
      label={label}
      value={value}
      onValueChange={onValueChange}
      size={size === "lg" ? "md" : "sm"}
      className={cn(
        size === "lg" && "p-[var(--pui-size-1,0.25rem)] [&_[role=radio]]:h-8 [&_[role=radio]]:px-4",
        className,
      )}
      options={options.map((o) => {
        const note = value === o.value ? (o.activeBadge ?? o.badge) : o.badge;
        return {
          value: o.value,
          label: o.label,
          accessory: note ? (
            <span
              data-slot="billing-toggle-badge"
              className={cn(
                "inline-grid h-4.5 place-items-center rounded-pill bg-green-tint px-1.5 text-2xs leading-none font-medium text-green",
                classNames?.badge,
              )}
            >
              {note}
            </span>
          ) : undefined,
        };
      })}
    />
  );
}

export default BillingToggle;
