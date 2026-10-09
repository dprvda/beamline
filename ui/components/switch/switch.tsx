"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { SwitchDefaults } from "./defaults";
export type { SwitchDefaults } from "./defaults";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import styles from "./switch.module.css";

export type SwitchClassNames = Partial<Record<"root" | "control" | "thumb" | "text" | "label" | "description", string>>;

export interface SwitchProps extends ComponentProps<typeof RadixSwitch.Root> {
  classNames?: SwitchClassNames;
  /** Visible label; clicking it toggles. Without it, pass aria-label. */
  label?: ReactNode;
  description?: ReactNode;
  /** Where the label sits: before the switch (a settings row) or after it. */
  labelPosition?: "start" | "end";
  size?: "sm" | "md";
}

/** A setting that applies at once. checked / defaultChecked / onCheckedChange. */
export function Switch({
  label,
  description,
  labelPosition = "end",
  size: sizeProp,
  id,
  className,
  style,
  classNames,
  disabled,
  ref,
  onCheckedChange,
  ...props
}: SwitchProps) {
  const scopeDefaults = useComponentDefaults<SwitchDefaults>("switch", ["size"]);
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  // the knob travels as a bead: it reaches toward the side it is going to and gathers there (switch.module.css)
  const [travel, setTravel] = useState<"on" | "off" | null>(null);
  const auto = useId();
  const switchId = id ?? `switch-${auto}`;
  const descId = description ? `${switchId}-description` : undefined;
  const control = (
    <RadixSwitch.Root
      ref={ref}
      style={!label ? style : undefined}
      id={switchId}
      data-slot="switch"
      disabled={disabled}
      aria-describedby={descId}
      onCheckedChange={(next) => {
        setTravel(next ? "on" : "off");
        onCheckedChange?.(next);
      }}
      className={cn(styles.track, styles[size], classNames?.control, !label && classNames?.root, !label && className)}
      {...props}
    >
      <RadixSwitch.Thumb
        data-slot="switch-thumb"
        data-travel={travel ?? undefined}
        onAnimationEnd={() => setTravel(null)}
        className={cn(styles.thumb, classNames?.thumb)}
      />
    </RadixSwitch.Root>
  );
  if (!label) return control;
  const text = (
    <div data-slot="switch-text" className={cn("grid min-w-0 gap-0.5", classNames?.text)}>
      <label
        htmlFor={switchId}
        data-slot="switch-label"
        className={cn(
          "cursor-pointer text-sm leading-[var(--pui-leading-body)] font-medium text-ink select-none group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-[var(--pui-opacity-disabled)]",
          classNames?.label,
        )}
      >
        {label}
      </label>
      {description && (
        <p
          id={descId}
          data-slot="switch-description"
          className={cn("text-xs leading-snug text-ink-3", classNames?.description)}
        >
          {description}
        </p>
      )}
    </div>
  );
  return (
    <div
      data-slot="switch-field"
      data-disabled={disabled ? "" : undefined}
      style={style}
      className={cn(
        "group flex items-start gap-3",
        labelPosition === "start" && "justify-between",
        classNames?.root,
        className,
      )}
    >
      {labelPosition === "start" ? (
        <>
          {text}
          {control}
        </>
      ) : (
        <>
          {control}
          {text}
        </>
      )}
    </div>
  );
}

export default Switch;
