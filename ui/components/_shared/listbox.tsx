"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Highlight, filterRanked } from "./match";
import { cn } from "@/lib/utils";
import { GlidePlate } from "./glide";
import overlay from "./overlay.module.css";

export interface ListOption {
  value: string;
  label: string;
  description?: string;
  /** Other words that should find it. */
  keywords?: string[];
  icon?: ReactNode;
  disabled?: boolean;
  /** Heading it sits under (Billing address). With no query the list shows a heading where the group changes, in the
   * given order; while searching, results rank flat and each row names its group beside its description. */
  group?: string;
}

/** Filtering and the active row for a search-as-you-type list; the field keeps focus and points at the active row. */
export function useListbox(options: ListOption[], query: string) {
  // a group's name finds its options too
  const filtered = useMemo(
    () => filterRanked(options, query, (o) => (o.group ? { ...o, keywords: [...(o.keywords ?? []), o.group] } : o)),
    [options, query],
  );
  const [active, setActive] = useState(0);
  const viaKeys = useRef(false);
  useEffect(() => {
    setActive(
      Math.max(
        0,
        filtered.findIndex((o) => !o.disabled),
      ),
    );
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps -- reset per question
  const move = (delta: number) => {
    if (!filtered.length) return;
    viaKeys.current = true;
    let i = active;
    for (let n = 0; n < filtered.length; n++) {
      i = (i + delta + filtered.length) % filtered.length;
      if (!filtered[i].disabled) break;
    }
    setActive(i);
  };
  return {
    filtered,
    active: Math.min(active, filtered.length - 1),
    setActive,
    move,
    viaKeys,
    current: filtered[Math.min(active, filtered.length - 1)],
  };
}

/** The list itself: rows in the system's menu look, the match emphasised, chosen rows checked. */
export function Listbox({
  id,
  label,
  options,
  query,
  active,
  onActive,
  isSelected,
  onPick,
  multiple,
  emptyText,
  viaKeys,
  className,
}: {
  id: string;
  label: string;
  options: ListOption[];
  query: string;
  active: number;
  onActive: (i: number) => void;
  isSelected: (value: string) => boolean;
  onPick: (option: ListOption) => void;
  multiple?: boolean;
  emptyText?: ReactNode;
  viaKeys: { current: boolean };
  className?: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!viaKeys.current) return;
    list.current?.querySelector(`#${CSS.escape(`${id}-${active}`)}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, viaKeys]);
  return (
    <div
      ref={list}
      id={id}
      role="listbox"
      aria-label={label}
      aria-multiselectable={multiple || undefined}
      onPointerMove={() => {
        viaKeys.current = false;
      }}
      className={cn(
        "relative max-h-[min(300px,var(--radix-popover-content-available-height,300px))] overflow-y-auto p-1",
        className,
      )}
    >
      <GlidePlate list={list} selector={options.length ? `#${CSS.escape(`${id}-${active}`)}` : null} reset={query} />
      {options.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-ink-3">{emptyText ?? <>No match for “{query}”.</>}</div>
      )}
      {options.map((o, i) => {
        const on = isSelected(o.value);
        const prev = options[i - 1];
        // headings only for the unsearched list, where they follow the caller's order; arrow keys never land on them
        const groupStart = !query && (o.group ?? "") !== (prev?.group ?? "") && (i > 0 || !!o.group);
        const detail = query && o.group ? [o.group, o.description].filter(Boolean).join(" · ") : o.description;
        return (
          <Fragment key={o.value}>
            {groupStart && i > 0 && (
              <div role="presentation" data-slot="listbox-separator" className={overlay.separator} />
            )}
            {groupStart && o.group && (
              <div role="presentation" data-slot="listbox-group" className={overlay.heading}>
                {o.group}
              </div>
            )}
            <div
              id={`${id}-${i}`}
              role="option"
              aria-selected={on}
              aria-disabled={o.disabled || undefined}
              aria-description={!query && o.group ? o.group : undefined}
              data-disabled={o.disabled ? "" : undefined}
              data-active={i === active ? "" : undefined}
              className={cn(overlay.item, "cursor-pointer", detail && "py-1.5")}
              onPointerMove={() => {
                if (i !== active && !o.disabled) onActive(i);
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!o.disabled) onPick(o);
              }}
            >
              {multiple && (
                <span
                  aria-hidden
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-[calc(var(--pui-radius-chip)-2px)] shadow-[inset_0_0_0_1px_var(--pui-line-strong)]",
                    on && "bg-accent text-[var(--pui-accent-foreground)] shadow-none",
                  )}
                >
                  {on && <Check className="!size-3 !text-current" strokeWidth={3} />}
                </span>
              )}
              {o.icon}
              <span className="grid min-w-0 flex-1 gap-px leading-snug">
                <span className="truncate">
                  <Highlight text={o.label} query={query} />
                </span>
                {detail && <span className="truncate text-xs text-ink-3">{detail}</span>}
              </span>
              {!multiple && on && <Check className="!text-accent" />}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
