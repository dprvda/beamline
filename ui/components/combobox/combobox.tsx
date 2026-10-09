"use client";

import { useComposedRef } from "@/hooks/use-composed-ref";

import { useComponentDefaults } from "@/runtime/appearance";
import type { ComboboxDefaults } from "./defaults";
export type { ComboboxDefaults } from "./defaults";

import { useEffect, useId, useRef, useState, type Ref, type CSSProperties, type ReactNode } from "react";
import { ChevronsUpDown, Search, X } from "lucide-react";
import * as RadixPopover from "@radix-ui/react-popover";
import {
  Field,
  FieldFrame,
  fieldControlClass,
  useFieldIds,
  type FieldClassNames,
  type FieldSize,
} from "@/components/_shared/field";
import { Listbox, useListbox, type ListOption } from "@/components/_shared/listbox";
import { BottomSheet } from "@/components/bottom-sheet/bottom-sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePortalContainer } from "@/runtime/appearance";
import { cn } from "@/lib/utils";
import overlay from "@/components/_shared/overlay.module.css";

export type ComboboxOption = ListOption;

export interface ComboboxProps {
  label: ReactNode;
  hideLabel?: boolean;
  options: ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  description?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  /** What to say when nothing matches. Default: No match for “…”. */
  emptyMessage?: ReactNode;
  /** Show a × that clears the choice. */
  clearable?: boolean;
  /** Heading of the list's bottom sheet below 640 px. Default: the label. */
  sheetTitle?: string;
  size?: FieldSize;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  /** Classes for documented field parts; root style does not replace native behavior. */
  classNames?: FieldClassNames & Partial<Record<"input" | "clear" | "toggle" | "content", string>>;
  style?: CSSProperties;
  ref?: Ref<HTMLInputElement>;
}

/**
 * One value from a long list, found by typing: time zones, countries, customers. Typing ranks label starts first;
 * ↑ ↓ move, Enter picks, Escape closes and restores what was chosen. The field keeps focus throughout. Below 640 px
 * the list opens in a bottom sheet with its own search field, clear of the on-screen keyboard; focus comes back to
 * the field when it closes.
 */
export function Combobox({
  label,
  hideLabel,
  options,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  description,
  error,
  placeholder = "Search",
  emptyMessage,
  clearable,
  sheetTitle,
  size: sizeProp,
  disabled,
  required,
  id,
  className,
  classNames,
  style,
  ref,
}: ComboboxProps) {
  const scopeDefaults = useComponentDefaults<ComboboxDefaults>("combobox", ["size"]);
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  const [own, setOwn] = useState<string | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : own;
  const chosen = options.find((o) => o.value === value) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const { filtered, active, setActive, move, viaKeys, current } = useListbox(options, typing ? query : "");
  const { controlId, descriptionId, errorId, aria } = useFieldIds(id, { description, error });
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const attach = useComposedRef(input, ref);
  const container = usePortalContainer();
  // a phone: the list is a sheet, and the field only opens it (no keyboard under a popover)
  const phone = useMediaQuery("(max-width: 639px)");
  const [sheet, setSheet] = useState(false);
  // a sheet left open when the screen widens past 640 px must not come back by itself
  useEffect(() => {
    if (!phone) setSheet(false);
  }, [phone]);
  const openSheet = (initial = "") => {
    if (disabled) return;
    setQuery(initial);
    setTyping(!!initial);
    setSheet(true);
  };

  // when the list opens without typing, the chosen row is the active one
  useEffect(() => {
    if ((open || sheet) && !typing && chosen)
      setActive(
        Math.max(
          0,
          filtered.findIndex((o) => o.value === chosen.value),
        ),
      );
  }, [open, sheet]); // eslint-disable-line react-hooks/exhaustive-deps -- on open only
  const pick = (o: ListOption) => {
    if (valueProp === undefined) setOwn(o.value);
    onValueChange?.(o.value);
    setTyping(false);
    setQuery("");
    setOpen(false);
    setSheet(false);
  };
  const close = () => {
    setOpen(false);
    setTyping(false);
    setQuery("");
  };

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
      <RadixPopover.Root
        open={open && !disabled}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      >
        <RadixPopover.Anchor asChild>
          <div>
            <FieldFrame
              classNames={classNames}
              size={size}
              invalid={!!error}
              disabled={disabled}
              trailing={
                // nesting input (O1 §14.1): the 24px clear/open buttons round concentric with the field
                <span className="flex items-center gap-[var(--pui-space-0-5)] [--pui-nest-inset:calc((var(--_field-height)-1.5rem)/2)] [--pui-nest-radius:var(--pui-field-radius,var(--pui-radius-control))]">
                  {clearable && chosen && !disabled && (
                    <button
                      type="button"
                      data-slot="combobox-clear"
                      aria-label="Clear"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (valueProp === undefined) setOwn(null);
                        onValueChange?.("");
                        input.current?.focus();
                      }}
                      className={cn(
                        "grid size-6 place-items-center rounded-[clamp(var(--pui-radius-chip),calc(var(--pui-nest-radius)-var(--pui-nest-inset)),var(--pui-radius-control))] hover:bg-hover hover:text-ink",
                        classNames?.clear,
                      )}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    tabIndex={-1}
                    data-slot="combobox-toggle"
                    aria-label={open || sheet ? "Close list" : "Open list"}
                    disabled={disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (phone) openSheet();
                      else setOpen((o) => !o);
                      input.current?.focus();
                    }}
                    className={cn(
                      "grid size-6 place-items-center rounded-[clamp(var(--pui-radius-chip),calc(var(--pui-nest-radius)-var(--pui-nest-inset)),var(--pui-radius-control))] hover:text-ink",
                      classNames?.toggle,
                    )}
                  >
                    <ChevronsUpDown className="size-4" />
                  </button>
                </span>
              }
            >
              <input
                ref={attach}
                data-slot="combobox"
                {...aria}
                role="combobox"
                aria-expanded={phone ? sheet : open}
                aria-haspopup={phone ? "dialog" : undefined}
                aria-controls={phone ? undefined : listId}
                aria-autocomplete={phone ? undefined : "list"}
                required={required}
                aria-activedescendant={!phone && open && current ? `${listId}-${active}` : undefined}
                disabled={disabled}
                // no on-screen keyboard under the field on a phone (the sheet has its own search); unlike readOnly it still
                // takes part in required validation
                inputMode={phone ? "none" : undefined}
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                value={!phone && typing ? query : (chosen?.label ?? "")}
                className={cn(fieldControlClass, phone && "cursor-pointer", classNames?.input)}
                onChange={(e) => {
                  if (phone) {
                    openSheet(e.target.value);
                    return;
                  }
                  setQuery(e.target.value);
                  setTyping(true);
                  setOpen(true);
                }}
                onFocus={(e) => {
                  if (!phone) e.currentTarget.select();
                }}
                // a click shows the options (Tab alone does not, so moving through a form stays quiet)
                onClick={() => {
                  if (phone) openSheet();
                  else if (!open && !disabled) setOpen(true);
                }}
                onBlur={() => {
                  if (!phone) close();
                }}
                onKeyDown={(e) => {
                  if (phone) {
                    // the field opens the sheet; a typed letter starts its search
                    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
                      e.preventDefault();
                      openSheet();
                    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
                      e.preventDefault();
                      openSheet(e.key);
                    }
                    return;
                  }
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    if (!open) setOpen(true);
                    else move(e.key === "ArrowDown" ? 1 : -1);
                  } else if (e.key === "Enter" && open) {
                    e.preventDefault();
                    if (current && !current.disabled) pick(current);
                  } else if (e.key === "Escape" && open) {
                    e.preventDefault();
                    e.stopPropagation();
                    close();
                  } else if (e.key === "Home" && open && !typing) {
                    e.preventDefault();
                    setActive(0);
                  } else if (e.key === "End" && open && !typing) {
                    e.preventDefault();
                    setActive(filtered.length - 1);
                  }
                }}
              />
            </FieldFrame>
          </div>
        </RadixPopover.Anchor>
        {!phone && container !== null && (
          <RadixPopover.Portal container={container}>
            <RadixPopover.Content
              data-slot="combobox-list"
              sideOffset={6}
              align="start"
              collisionPadding={8}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                if (e.target instanceof Node && input.current?.closest("[data-slot=field]")?.contains(e.target))
                  e.preventDefault();
              }}
              className={cn(
                overlay.surface,
                "w-[var(--radix-popover-trigger-width)] min-w-[220px]",
                classNames?.content,
              )}
            >
              <Listbox
                id={listId}
                label={typeof label === "string" ? label : "Options"}
                options={filtered}
                query={typing ? query : ""}
                active={active}
                onActive={setActive}
                viaKeys={viaKeys}
                isSelected={(v) => v === value}
                onPick={pick}
                emptyText={emptyMessage}
              />
            </RadixPopover.Content>
          </RadixPopover.Portal>
        )}
      </RadixPopover.Root>
      {phone && (
        <BottomSheet
          open={sheet && !disabled}
          onOpenChange={(o) => {
            if (!o) close();
            setSheet(o);
          }}
          title={sheetTitle ?? (typeof label === "string" ? label : placeholder)}
          detents={[0.92]}
          classNames={{ body: "flex flex-col" }}
        >
          <SheetList
            listId={listId}
            label={typeof label === "string" ? label : "Options"}
            placeholder={placeholder}
            query={query}
            onQuery={(q) => {
              setQuery(q);
              setTyping(true);
            }}
            filtered={filtered}
            active={active}
            setActive={setActive}
            move={move}
            viaKeys={viaKeys}
            current={current}
            value={value}
            onPick={pick}
            emptyText={emptyMessage}
            className={classNames?.content}
          />
        </BottomSheet>
      )}
    </Field>
  );
}

/** The sheet's search field and list: the same listbox, keys and ranking as the popover, with the field inside. */
function SheetList({
  listId,
  label,
  placeholder,
  query,
  onQuery,
  filtered,
  active,
  setActive,
  move,
  viaKeys,
  current,
  value,
  onPick,
  emptyText,
  className,
}: {
  listId: string;
  label: string;
  placeholder: string;
  query: string;
  onQuery: (query: string) => void;
  filtered: ListOption[];
  active: number;
  setActive: (i: number) => void;
  move: (delta: number) => void;
  viaKeys: { current: boolean };
  current: ListOption | undefined;
  value: string | null;
  onPick: (option: ListOption) => void;
  emptyText?: ReactNode;
  className?: string;
}) {
  const search = useRef<HTMLInputElement>(null);
  // after the sheet's own focus scope settles (it records the field to return to), the search takes focus
  useEffect(() => {
    const frame = requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div data-slot="combobox-sheet" className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="shrink-0 p-[var(--pui-space-3)] pb-[var(--pui-space-2)]">
        <FieldFrame size="lg" leading={<Search aria-hidden className="size-4" />}>
          <input
            ref={search}
            data-slot="combobox-search"
            role="combobox"
            aria-label={`Search ${label}`}
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={current ? `${listId}-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder={placeholder}
            value={query}
            className={fieldControlClass}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                move(e.key === "ArrowDown" ? 1 : -1);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (current && !current.disabled) onPick(current);
              }
            }}
          />
        </FieldFrame>
      </div>
      <Listbox
        id={listId}
        label={label}
        options={filtered}
        query={query}
        active={active}
        onActive={setActive}
        viaKeys={viaKeys}
        isSelected={(v) => v === value}
        onPick={onPick}
        emptyText={emptyText}
        className="max-h-none min-h-0 flex-1 px-[var(--pui-space-2)] pb-[var(--pui-space-4)]"
      />
    </div>
  );
}

export default Combobox;
