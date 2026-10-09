"use client";

import { useId, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/label/label";
import { cn } from "@/lib/utils";
import styles from "./field.module.css";

export type FieldSize = "sm" | "md" | "lg";
export type FieldClassNames = Partial<
  Record<"root" | "label" | "frame" | "leading" | "trailing" | "description" | "error", string>
>;

export interface FieldOptions {
  /** Visible label, also the accessible name. */
  label?: ReactNode;
  /** Keep the label for assistive tech only (dense rows, toolbars). */
  hideLabel?: boolean;
  /** One line of help under the control. */
  description?: ReactNode;
  /** The problem and its fix; replaces the description and marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  size?: FieldSize;
}

/** Ids and aria wiring for one field: the control gets these spread onto it. */
export function useFieldIds(id?: string, { description, error }: Pick<FieldOptions, "description" | "error"> = {}) {
  const auto = useId();
  const controlId = id ?? `field-${auto}`;
  const descriptionId = description && !error ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  return {
    controlId,
    descriptionId,
    errorId,
    aria: {
      id: controlId,
      "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
      "aria-invalid": error ? true : undefined,
      "aria-errormessage": errorId,
    },
  };
}

/** Label above, control frame, then the description or the error. */
export function Field({
  label,
  hideLabel,
  description,
  error,
  required,
  controlId,
  descriptionId,
  errorId,
  className,
  classNames,
  style,
  slot = "field",
  requiredOnControl,
  children,
}: FieldOptions & {
  controlId: string;
  descriptionId?: string;
  errorId?: string;
  className?: string;
  classNames?: FieldClassNames;
  style?: CSSProperties;
  slot?: string;
  /** The control carries `required` itself, so the label does not repeat it in the control's name. */
  requiredOnControl?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-slot={slot}
      data-invalid={error ? "" : undefined}
      style={style}
      className={cn("grid min-w-0 content-start gap-[var(--pui-space-1-5)]", classNames?.root, className)}
    >
      {label != null && (
        <Label
          htmlFor={controlId}
          required={required}
          requiredOnControl={requiredOnControl}
          className={cn("text-label", hideLabel && "sr-only", classNames?.label)}
        >
          {label}
        </Label>
      )}
      {children}
      <FieldMessage
        error={error}
        description={description}
        errorId={errorId}
        descriptionId={descriptionId}
        classNames={classNames}
      />
    </div>
  );
}

/** The line under a field: its problem when there is one, otherwise its help. Shared by every field and choice group. */
export function FieldMessage({
  error,
  description,
  errorId,
  descriptionId,
  classNames,
}: Pick<FieldOptions, "error" | "description"> & {
  errorId?: string;
  descriptionId?: string;
  classNames?: Pick<FieldClassNames, "error" | "description">;
}) {
  if (error)
    return (
      <p
        id={errorId}
        data-slot="field-error"
        // a problem arrives (rises in) instead of switching on; the description it replaces is gone at once
        className={cn(
          "flex animate-enter-rise items-start gap-[var(--pui-space-1-5)] text-xs leading-snug text-red",
          classNames?.error,
        )}
      >
        <AlertCircle aria-hidden className="mt-px size-[var(--pui-icon-sm)] shrink-0" />
        {error}
      </p>
    );
  if (description)
    return (
      <p
        id={descriptionId}
        data-slot="field-description"
        className={cn("text-xs leading-snug text-ink-3", classNames?.description)}
      >
        {description}
      </p>
    );
  return null;
}

/** The frame a text-like control sits in; clicking anywhere on it focuses the control. */
export function FieldFrame({
  size = "md",
  invalid,
  disabled,
  readOnly,
  multiline,
  leading,
  trailing,
  className,
  classNames,
  children,
  onPointerDown,
}: {
  size?: FieldSize;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  multiline?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  classNames?: FieldClassNames;
  children: ReactNode;
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      data-slot="field-control"
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
      className={cn(styles.frame, styles[size], multiline && styles.multiline, classNames?.frame, className)}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        // a click on the frame's padding or an adornment that is not itself interactive focuses the control
        const t = e.target as HTMLElement;
        if (t === e.currentTarget || (t.closest("[data-adornment]") && !t.closest("button, a, input, [role=button]"))) {
          e.preventDefault();
          e.currentTarget.querySelector<HTMLElement>("input, textarea")?.focus();
        }
      }}
    >
      {leading && (
        <span
          data-slot="field-adornment"
          data-adornment="leading"
          className={cn(styles.adornment, classNames?.leading)}
        >
          {leading}
        </span>
      )}
      {children}
      {trailing && (
        <span
          data-slot="field-adornment"
          data-adornment="trailing"
          className={cn(styles.adornment, classNames?.trailing)}
        >
          {trailing}
        </span>
      )}
    </div>
  );
}

/** The class a native input or textarea needs inside a FieldFrame. */
export const fieldControlClass = styles.control;

/** What a choice group (segmented control, radio cards) spreads onto its own root when it is a form field. */
export interface ChoiceFieldAria {
  "aria-labelledby": string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

/**
 * A choice group as a form field: the visible label above (with the required marker), the group, then its help or its
 * problem — the same frame and message every text field has. Groups that name themselves only for assistive tech
 * (a view switch in a toolbar) do not use it.
 */
/**
 * Whether a choice control (segmented control, radio cards, chip group) is laid out as a form field, its label shown
 * above like every field's: when asked (`field`), when it has a description, error or required mark, and whenever its
 * label is not hidden. A view switch or a quick filter passes `hideLabel`: its label stays for assistive tech only.
 * (Trials t16 and t19: agents wrote <SegmentedControl label="Catering needed" …> and the question never showed.)
 */
export function choiceIsField(
  field: boolean | undefined,
  label: ReactNode,
  hideLabel: boolean | undefined,
  marked: boolean,
) {
  return field ?? (marked || (label != null && label !== "" && !hideLabel));
}

export function ChoiceField({
  slot,
  label,
  hideLabel,
  required,
  description,
  error,
  className,
  style,
  classNames,
  requiredOnControl,
  children,
}: Omit<FieldOptions, "size"> & {
  slot: string;
  /** The group carries `aria-required` itself (a radiogroup), so the label does not repeat it in the group's name. */
  requiredOnControl?: boolean;
  className?: string;
  style?: CSSProperties;
  classNames?: Pick<FieldClassNames, "label" | "description" | "error">;
  children: (aria: ChoiceFieldAria) => ReactNode;
}) {
  const auto = useId();
  const labelId = `choice-${auto}-label`;
  const messageId = error || description ? `choice-${auto}-message` : undefined;
  return (
    <div
      data-slot={slot}
      data-invalid={error ? "" : undefined}
      style={style}
      className={cn("grid min-w-0 content-start gap-[var(--pui-space-1-5)]", className)}
    >
      <Label
        id={labelId}
        required={required}
        requiredOnControl={requiredOnControl}
        className={cn("text-label", hideLabel && "sr-only", classNames?.label)}
      >
        {label}
      </Label>
      {children({
        "aria-labelledby": labelId,
        ...(messageId ? { "aria-describedby": messageId } : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      <FieldMessage
        error={error}
        description={description}
        errorId={messageId}
        descriptionId={messageId}
        classNames={classNames}
      />
    </div>
  );
}
