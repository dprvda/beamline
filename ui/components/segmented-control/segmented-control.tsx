"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { SegmentedControlDefaults } from "./defaults";
export type { SegmentedControlDefaults } from "./defaults";

import { useState, type CSSProperties, type Ref, type KeyboardEvent, type ReactNode } from "react";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useIndicator } from "@/hooks/use-indicator";
import { useContour } from "@/hooks/use-contour";
import { cn } from "@/lib/utils";
import { ChoiceField, choiceIsField, type ChoiceFieldAria } from "@/components/_shared/field";
import styles from "./segmented-control.module.css";

export interface Segment {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Content after the label, such as a badge. */
  accessory?: ReactNode;
  disabled?: boolean;
}

export type SegmentedControlClassNames = Partial<
  Record<"root" | "thumb" | "segment" | "field" | "label" | "description" | "error", string>
>;

export interface SegmentedControlProps {
  options: Segment[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The group's name or question ("Range", "View", "Gender"), shown above it like every field's label; `hideLabel` keeps it for
   *  assistive tech only (a view switch). */
  label: string;
  /** Lay it out as a form field (label above, description or error below). On unless the label is hidden and there is
   *  no description, error or required mark. */
  field?: boolean;
  /** Hide the label visually (it stays the accessible name): a view switch beside other controls. */
  hideLabel?: boolean;
  /** One line of help under the segments (makes it a field). */
  description?: ReactNode;
  /** The problem and its fix, e.g. a required choice not made (makes it a field and marks the group invalid). */
  error?: ReactNode;
  /** Marks the field's label as required (makes it a field). */
  required?: boolean;
  /** Submitted with a native form as name=value. */
  name?: string;
  /** Runs when a segment is pointed at or focused, before it is chosen: prefetch its data. */
  onOptionIntent?: (value: string) => void;
  size?: "sm" | "md";
  /** Stretch to the container and share the width equally. */
  fill?: boolean;
  /** Show each segment's icon alone, as a square; its label stays the accessible name and the tooltip. */
  iconOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  dir?: "ltr" | "rtl";
  ref?: Ref<HTMLDivElement>;
  classNames?: SegmentedControlClassNames;
}

/**
 * Two to five views or ranges of the same content: 1D / 1W / 1M, List / Board. One raised thumb slides to the chosen
 * segment as matter (ui/lib/contour.ts, shaped by the look): it leads, rounds its front and gathers, never bouncing. It is
 * a radio group: Tab enters at the chosen one, arrows move and choose; the choice is made at once, only the thumb settles.
 */
export function SegmentedControl({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  label,
  field,
  hideLabel,
  description,
  error,
  required,
  name,
  onOptionIntent,
  size: sizeProp,
  fill = false,
  iconOnly = false,
  className,
  style,
  dir,
  ref,
  classNames,
}: SegmentedControlProps) {
  const scopeDefaults = useComponentDefaults<SegmentedControlDefaults>("segmented-control", ["size"]);
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  const [own, setOwn] = useState(defaultValue ?? options[0]?.value);
  const value = valueProp ?? own;
  const choose = (v: string) => {
    if (valueProp === undefined) setOwn(v);
    onValueChange?.(v);
  };
  const [root, thumb] = useIndicator<HTMLDivElement>("[role=radio][aria-checked=true]", `${value}:${options.length}`);
  const thumbRef = useContour<HTMLSpanElement>(thumb);
  const rootRef = useComposedRef(root, ref);
  const enabled = options.filter((o) => !o.disabled);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const dir = { ArrowRight: rtl ? -1 : 1, ArrowDown: 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: -1 }[e.key];
    let next: Segment | undefined;
    if (dir) {
      const i = enabled.findIndex((o) => o.value === value);
      next = enabled[(i + dir + enabled.length) % enabled.length];
    } else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled.at(-1);
    if (!next) return;
    e.preventDefault();
    choose(next.value);
    root.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus();
  };
  const asField = choiceIsField(field, label, hideLabel, description != null || error != null || !!required);
  const chosenAny = options.some((o) => o.value === value);
  const control = (aria?: ChoiceFieldAria) => (
    <div
      ref={rootRef}
      dir={dir}
      style={asField ? undefined : style}
      role="radiogroup"
      aria-label={aria ? undefined : label}
      aria-required={required || undefined}
      {...aria}
      data-field={asField ? "" : undefined}
      data-slot="segmented-control"
      data-size={size}
      onKeyDown={onKey}
      className={cn(
        styles.root,
        size === "sm" && styles.sm,
        fill && styles.fill,
        iconOnly && styles.iconOnly,
        // inside a field's grid the control keeps its own width unless it fills
        asField && !fill && "justify-self-start",
        classNames?.root,
        !asField && className,
      )}
    >
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      {thumb && (
        <span ref={thumbRef} aria-hidden data-slot="segmented-thumb" className={cn(styles.thumb, classNames?.thumb)} />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            data-value={o.value}
            disabled={o.disabled}
            // with nothing chosen yet (a required form choice) the first enabled segment takes Tab
            tabIndex={on || (!chosenAny && o.value === enabled[0]?.value) ? 0 : -1}
            data-slot="segmented-item"
            className={cn(styles.segment, classNames?.segment)}
            onClick={() => choose(o.value)}
            onPointerEnter={() => onOptionIntent?.(o.value)}
            onFocus={() => onOptionIntent?.(o.value)}
            title={iconOnly ? o.label : undefined}
          >
            {o.icon}
            {iconOnly ? <span className="sr-only">{o.label}</span> : o.label}
            {o.accessory}
          </button>
        );
      })}
    </div>
  );
  if (!asField) return control();
  return (
    <ChoiceField
      slot="segmented-control-field"
      label={label}
      hideLabel={hideLabel}
      required={required}
      requiredOnControl
      description={description}
      error={error}
      className={cn(classNames?.field, className)}
      style={style}
      classNames={classNames}
    >
      {control}
    </ChoiceField>
  );
}

export default SegmentedControl;
