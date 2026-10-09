"use client";

import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import {
  Field,
  FieldFrame,
  fieldControlClass,
  useFieldIds,
  type FieldSize,
  type FieldClassNames,
} from "@/components/_shared/field";

import { cn } from "@/lib/utils";
import { useComponentDefaults } from "@/runtime/appearance";
import type { InputDefaults } from "./defaults";
export type { InputDefaults } from "./defaults";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Visible label and accessible name. */
  label: ReactNode;
  /** Keep the label for assistive tech only (dense rows, tables). */
  hideLabel?: boolean;
  /** One line of help under the field. */
  description?: ReactNode;
  /** The problem and its fix; marks the field invalid. */
  error?: ReactNode;
  /** Height 32 / 36 / 40 px. */
  size?: FieldSize;
  /** Content before the text: an icon, a unit, a prefix like "https://". */
  leading?: ReactNode;
  /** Content after the text: a unit, a status, an icon button. */
  trailing?: ReactNode;
  /** Lands on the outer field (label, frame, message). */
  className?: string;
  classNames?: FieldClassNames & { input?: string };
  ref?: Ref<HTMLInputElement>;
}

/** A single-line text field with its label, help and error wired for assistive tech. */
export function Input({
  label,
  hideLabel,
  description,
  error,
  size: sizeProp,
  leading,
  trailing,
  id,
  className,
  classNames,
  style,
  required,
  disabled,
  readOnly,
  ref,
  ...props
}: InputProps) {
  const defaults = useComponentDefaults<InputDefaults>("input", ["size"]);
  const size = sizeProp ?? defaults.size ?? "md";
  const { controlId, descriptionId, errorId, aria } = useFieldIds(id, { description, error });
  return (
    <Field
      label={label}
      hideLabel={hideLabel}
      description={description}
      error={error}
      required={required}
      requiredOnControl
      controlId={controlId}
      descriptionId={descriptionId}
      errorId={errorId}
      className={className}
      classNames={classNames}
      style={style}
    >
      <FieldFrame
        size={size}
        classNames={classNames}
        invalid={!!error}
        disabled={disabled}
        readOnly={readOnly}
        leading={leading}
        trailing={trailing}
      >
        <input
          ref={ref}
          data-slot="input"
          {...aria}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(fieldControlClass, classNames?.input)}
          {...props}
        />
      </FieldFrame>
    </Field>
  );
}

export default Input;
