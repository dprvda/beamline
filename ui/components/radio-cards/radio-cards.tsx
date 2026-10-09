"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { glideProps, useIndicator } from "@/hooks/use-indicator";
import { cn } from "@/lib/utils";
import { ChoiceField, choiceIsField, type ChoiceFieldAria } from "@/components/_shared/field";
import styles from "./radio-cards.module.css";

export interface RadioCard {
  value: string;
  label: ReactNode;
  /** One or two lines under the label. */
  detail?: ReactNode;
  /** The figure people compare: a price, a size. */
  figure?: ReactNode;
  /** An image or other preview. Keep interactive controls outside the radio card. */
  media?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export type RadioCardsLayout = "grid" | "stacked" | "row";
export type RadioCardsClassNames = Partial<
  Record<
    | "root"
    | "item"
    | "media"
    | "head"
    | "icon"
    | "text"
    | "label"
    | "detail"
    | "mark"
    | "figure"
    | "ring"
    | "field"
    | "fieldLabel"
    | "description"
    | "error",
    string
  >
>;

export interface RadioCardsProps {
  /** Stable choices with optional media, detail, figure and icon. */
  cards: RadioCard[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Stack the cards as rows instead of setting them side by side. */
  stacked?: boolean;
  /** Grid by default; row keeps one nonwrapping horizontal row. Overrides the stacked shorthand. */
  layout?: RadioCardsLayout;
  /** Grid minimum or row card width, in px. Defaults to inherited --pui-radio-cards-card-width, then 180. */
  cardWidth?: number;
  /** The group's name or question (e.g. "Plan"), shown above it like every field's label; `hideLabel` keeps it for
   *  assistive tech only. */
  label: string;
  /** Lay it out as a form field (label above, description or error below). On unless the label is hidden and there is
   *  no description, error or required mark. */
  field?: boolean;
  /** Hide the label visually (it stays the accessible name). */
  hideLabel?: boolean;
  /** One line of help under the cards (makes it a field). */
  description?: ReactNode;
  /** The problem and its fix, e.g. a required choice not made (makes it a field and marks the group invalid). */
  error?: ReactNode;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Classes for the documented visual parts; keyboard behavior and measured ring remain owned by the control. */
  classNames?: RadioCardsClassNames;
  style?: CSSProperties;
}

/**
 * One choice among a few rich options: plans, regions, instance sizes. A single selection ring slides to the chosen
 * card; arrows move and choose, like any radio group.
 */
export function RadioCards({
  cards,
  value,
  defaultValue,
  onValueChange,
  stacked = false,
  layout: layoutProp,
  cardWidth,
  label,
  field,
  hideLabel,
  description,
  error,
  name,
  required,
  disabled,
  className,
  classNames,
  style,
}: RadioCardsProps) {
  const layout = layoutProp ?? (stacked ? "stacked" : "grid");
  const [current, setCurrent] = useState(value ?? defaultValue ?? null);
  const chosen = value !== undefined ? value : current;
  const [group, ring] = useIndicator<HTMLDivElement>(
    "[role=radio][data-state=checked]",
    `${chosen}:${layout}:${cards.length}`,
  );
  const geometry =
    cardWidth === undefined ? undefined : ({ "--pui-radio-cards-card-width": `${cardWidth}px` } as CSSProperties);
  const asField = choiceIsField(field, label, hideLabel, description != null || error != null || !!required);
  const control = (aria?: ChoiceFieldAria) => (
    <RadioGroup.Root
      ref={group}
      data-slot="radio-cards"
      data-layout={layout}
      value={value ?? undefined}
      defaultValue={defaultValue ?? undefined}
      onValueChange={(v) => {
        setCurrent(v);
        onValueChange?.(v);
      }}
      name={name}
      required={required}
      disabled={disabled}
      aria-label={aria ? undefined : label}
      {...aria}
      className={cn(
        styles.group,
        layout === "stacked" && styles.list,
        layout === "row" && styles.row,
        classNames?.root,
        !asField && className,
      )}
      style={asField ? geometry : { ...geometry, ...style }}
    >
      {ring && (
        <span
          aria-hidden
          data-slot="radio-cards-ring"
          className={cn(styles.ring, classNames?.ring)}
          {...glideProps(ring)}
        />
      )}
      {cards.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          data-value={o.value}
          data-slot="radio-cards-item"
          disabled={o.disabled}
          className={cn(styles.card, classNames?.item)}
        >
          {o.media != null && (
            <span data-slot="radio-cards-media" className={cn(styles.media, classNames?.media)}>
              {o.media}
            </span>
          )}
          <span data-slot="radio-cards-head" className={cn(styles.head, classNames?.head)}>
            {o.icon && (
              <span data-slot="radio-cards-icon" className={cn(styles.icon, classNames?.icon)}>
                {o.icon}
              </span>
            )}
            <span data-slot="radio-cards-text" className={cn(styles.text, classNames?.text)}>
              <span data-slot="radio-cards-label" className={cn(styles.label, classNames?.label)}>
                {o.label}
              </span>
              {o.detail && (
                <span data-slot="radio-cards-detail" className={cn(styles.detail, classNames?.detail)}>
                  {o.detail}
                </span>
              )}
            </span>
            <span
              aria-hidden
              data-slot="radio-cards-mark"
              data-state={chosen === o.value ? "checked" : "unchecked"}
              className={cn(styles.mark, classNames?.mark)}
            />
          </span>
          {o.figure && (
            <span data-slot="radio-cards-figure" className={cn(styles.figure, classNames?.figure)}>
              {o.figure}
            </span>
          )}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
  if (!asField) return control();
  return (
    <ChoiceField
      slot="radio-cards-field"
      label={label}
      hideLabel={hideLabel}
      required={required}
      requiredOnControl
      description={description}
      error={error}
      className={cn(classNames?.field, className)}
      style={style}
      classNames={{ label: classNames?.fieldLabel, description: classNames?.description, error: classNames?.error }}
    >
      {control}
    </ChoiceField>
  );
}

export default RadioCards;
