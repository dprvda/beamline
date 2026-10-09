"use client";

import { Fragment, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { FollowPlate } from "@/components/_shared/glide";
import { Check, ChevronsUpDown } from "lucide-react";
import * as RadixSelect from "@radix-ui/react-select";
import { Field, useFieldIds, type FieldSize, type FieldClassNames } from "@/components/_shared/field";
import { usePortalContainer, useComponentDefaults } from "@/runtime/appearance";
import type { SelectDefaults } from "./defaults";
export type { SelectDefaults } from "./defaults";
import { cn } from "@/lib/utils";
import field from "@/components/_shared/field.module.css";
import overlay from "@/components/_shared/overlay.module.css";
import styles from "./select.module.css";

export interface SelectOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  /** A short detail at the end of the row (an offset, a plan), shown in the list only. */
  description?: ReactNode;
  disabled?: boolean;
}
export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps {
  label: ReactNode;
  hideLabel?: boolean;
  description?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  /** Options, or groups of options with a heading. */
  options: (SelectOption | SelectGroup)[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: FieldSize;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  classNames?: FieldClassNames &
    Partial<Record<"trigger" | "value" | "icon" | "list" | "viewport" | "item" | "groupLabel" | "separator", string>>;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}

const isGroup = (o: SelectOption | SelectGroup): o is SelectGroup => "options" in o;

/** One choice from a short known list, in the same frame as every text field. Type to jump; the list opens under the
 *  field at its width. */
export function Select({
  label,
  hideLabel,
  description,
  error,
  placeholder = "Select",
  options,
  value,
  defaultValue,
  onValueChange,
  size: sizeProp,
  disabled,
  required,
  name,
  id,
  className,
  classNames,
  style,
  open,
  defaultOpen,
  onOpenChange,
  ref,
}: SelectProps) {
  const defaults = useComponentDefaults<SelectDefaults>("select", ["size"]);
  const size = sizeProp ?? defaults.size ?? "md";
  const { controlId, descriptionId, errorId, aria } = useFieldIds(id, { description, error });
  const container = usePortalContainer();
  const viewport = useRef<HTMLDivElement>(null);
  const item = (o: SelectOption) => (
    <RadixSelect.Item
      key={o.value}
      value={o.value}
      disabled={o.disabled}
      data-menu-item=""
      data-glide=""
      data-slot="select-item"
      className={cn(overlay.item, "pe-8", classNames?.item)}
    >
      {o.icon}
      <span className="min-w-0 truncate">
        <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
      </span>
      {o.description && <span className={styles.detail}>{o.description}</span>}
      <RadixSelect.ItemIndicator className={styles.check}>
        <Check />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
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
      <RadixSelect.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
        name={name}
      >
        <RadixSelect.Trigger
          ref={ref}
          data-slot="select"
          {...aria}
          className={cn(field.frame, field[size], styles.trigger, classNames?.trigger)}
          data-invalid={error ? "" : undefined}
        >
          <span data-slot="select-value" className={cn("min-w-0 truncate", classNames?.value)}>
            <RadixSelect.Value placeholder={placeholder} />
          </span>
          <RadixSelect.Icon data-slot="select-icon" className={classNames?.icon}>
            <ChevronsUpDown className={styles.chevron} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        {container !== null && (
          <RadixSelect.Portal container={container}>
            <RadixSelect.Content
              data-slot="select-list"
              position="popper"
              sideOffset={6}
              collisionPadding={8}
              className={cn(
                overlay.surface,
                overlay.menu,
                classNames?.list,
                "max-h-[min(360px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)]",
              )}
            >
              <RadixSelect.Viewport
                ref={viewport}
                data-slot="select-viewport"
                className={cn("relative", classNames?.viewport)}
              >
                <FollowPlate list={viewport} rows="[data-slot=select-item]" />
                {options.map((o, i) =>
                  isGroup(o) ? (
                    <Fragment key={o.label}>
                      {i > 0 && (
                        <RadixSelect.Separator
                          data-slot="select-separator"
                          className={cn(overlay.separator, classNames?.separator)}
                        />
                      )}
                      <RadixSelect.Group>
                        <RadixSelect.Label
                          data-slot="select-group-label"
                          className={cn(overlay.heading, classNames?.groupLabel)}
                        >
                          {o.label}
                        </RadixSelect.Label>
                        {o.options.map(item)}
                      </RadixSelect.Group>
                    </Fragment>
                  ) : (
                    item(o)
                  ),
                )}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        )}
      </RadixSelect.Root>
    </Field>
  );
}

export default Select;
