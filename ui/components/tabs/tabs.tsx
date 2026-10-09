"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { TabsDefaults } from "./defaults";
export type { TabsDefaults } from "./defaults";

import { createContext, useContext, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { useScopeDirection } from "@/hooks/use-scope-direction";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useIndicator } from "@/hooks/use-indicator";
import { useContour } from "@/hooks/use-contour";
import { cn } from "@/lib/utils";
import styles from "./tabs.module.css";

type TabsVariant = "underline" | "pill";

/** Switches between panels of one object: Overview, Activity, Settings. value / defaultValue / onValueChange.
 *  Reading direction: an explicit `dir`, else a Direction provider, else the direction the page already has around
 *  it (Radix would otherwise stamp dir="ltr" and keep an RTL page's tabs left to right with reversed arrow keys). */
export function Tabs({ className, dir, ref, ...props }: ComponentProps<typeof RadixTabs.Root>) {
  const [attach, direction] = useScopeDirection<HTMLDivElement>(ref, dir);
  return (
    <RadixTabs.Root
      ref={attach}
      data-slot="tabs"
      dir={direction}
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

export interface TabsListProps extends ComponentProps<typeof RadixTabs.List> {
  /** underline: a line under the active tab (pages, panels). pill: a raised chip on a track (compact toolbars). */
  variant?: TabsVariant;
  classNames?: Partial<Record<"root" | "indicator", string>>;
}

/** Keeps the active tab in view by scrolling the row only, never the page. Works on screen positions, so it is the
 *  same in either reading direction (RTL scrollLeft runs negative). */
function reveal(tab: HTMLElement, row: HTMLElement) {
  const t = tab.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  const room = parseFloat(getComputedStyle(row).scrollPaddingInlineStart) || 0;
  if (t.left < r.left) row.scrollLeft -= r.left - t.left + room;
  else if (t.right > r.right) row.scrollLeft += t.right - r.right + room;
}

/**
 * The row of tabs. One indicator travels to the active tab as matter (ui/lib/contour.ts); with more tabs than room the row scrolls sideways and the
 * active tab scrolls into view. ← → move between tabs, Home and End jump to the ends.
 */
export function TabsList({ variant: variantProp, className, classNames, children, ref, ...props }: TabsListProps) {
  const scopeDefaults = useComponentDefaults<TabsDefaults>("tabs", ["variant"]);
  const variant = variantProp ?? scopeDefaults.variant ?? "underline";

  const [list, mark] = useIndicator<HTMLDivElement>("[role=tab][data-state=active]", undefined, reveal);
  const attach = useComposedRef(list, ref);
  // the underline is the tab's bottom 2px; the pill covers the tab
  const surface = useMemo(
    () => (mark && variant === "underline" ? { ...mark, y: mark.y + mark.h - 2, h: 2 } : mark),
    [mark, variant],
  );
  const markRef = useContour<HTMLSpanElement>(surface);
  return (
    <RadixTabs.List
      ref={attach}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(styles.list, styles[variant], classNames?.root, className)}
      {...props}
    >
      {mark && (
        <span
          ref={markRef}
          aria-hidden
          data-slot="tabs-indicator"
          className={cn(styles.indicator, variant === "underline" ? styles.line : styles.thumb, classNames?.indicator)}
        />
      )}
      {children}
    </RadixTabs.List>
  );
}

export interface TabsTriggerProps extends ComponentProps<typeof RadixTabs.Trigger> {
  icon?: ReactNode;
  /** A number after the label: open orders, unread items. */
  count?: number;
  classNames?: Partial<Record<"root" | "count", string>>;
}

export function TabsTrigger({ icon, count, className, classNames, children, ...props }: TabsTriggerProps) {
  return (
    <RadixTabs.Trigger data-slot="tabs-trigger" className={cn(styles.trigger, classNames?.root, className)} {...props}>
      {icon}
      {children}
      {count != null && (
        <span data-slot="tabs-count" className={cn(styles.count, classNames?.count)}>
          {count}
        </span>
      )}
    </RadixTabs.Trigger>
  );
}

const NavContext = createContext<{ value?: string; select: (value: string) => void } | null>(null);

export interface TabsNavProps extends Omit<ComponentProps<"nav">, "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  classNames?: Partial<Record<"root" | "list" | "indicator", string>>;
}

/**
 * The tab row as navigation, for tabs that switch pages or routes rather than panels on this page: a `nav` of links
 * or buttons, the current one marked `aria-current="page"`, with the same look and travelling indicator as TabsList.
 * Tab moves between items; Enter or Space follows one. value / defaultValue / onValueChange.
 */
export function TabsNav({
  value: valueProp,
  defaultValue,
  onValueChange,
  variant: variantProp,
  className,
  classNames,
  children,
  ref,
  ...props
}: TabsNavProps) {
  const scopeDefaults = useComponentDefaults<TabsDefaults>("tabs", ["variant"]);
  const variant = variantProp ?? scopeDefaults.variant ?? "underline";
  const [own, setOwn] = useState(defaultValue);
  const value = valueProp ?? own;
  const [list, mark] = useIndicator<HTMLDivElement>("[data-slot=tabs-trigger][aria-current=page]", undefined, reveal);
  const surface = useMemo(
    () => (mark && variant === "underline" ? { ...mark, y: mark.y + mark.h - 2, h: 2 } : mark),
    [mark, variant],
  );
  const markRef = useContour<HTMLSpanElement>(surface);
  const context = useMemo(
    () => ({
      value,
      select: (next: string) => {
        if (valueProp === undefined) setOwn(next);
        onValueChange?.(next);
      },
    }),
    [value, valueProp, onValueChange],
  );
  return (
    <nav ref={ref} data-slot="tabs-nav" className={cn(classNames?.root, className)} {...props}>
      <div
        ref={list}
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(styles.list, styles[variant], classNames?.list)}
      >
        {mark && (
          <span
            ref={markRef}
            aria-hidden
            data-slot="tabs-indicator"
            className={cn(
              styles.indicator,
              variant === "underline" ? styles.line : styles.thumb,
              classNames?.indicator,
            )}
          />
        )}
        <NavContext.Provider value={context}>{children}</NavContext.Provider>
      </div>
    </nav>
  );
}

export interface TabsNavItemProps extends Omit<ComponentProps<"button">, "value"> {
  value: string;
  /** A link instead of a button, for route changes the browser should know about. */
  href?: string;
  icon?: ReactNode;
  count?: number;
  classNames?: Partial<Record<"root" | "count", string>>;
}

export function TabsNavItem({
  value,
  href,
  icon,
  count,
  disabled,
  onClick,
  className,
  classNames,
  children,
  ...props
}: TabsNavItemProps) {
  const nav = useContext(NavContext);
  const current = nav?.value === value;
  const shared = {
    "data-slot": "tabs-trigger",
    "data-state": current ? "active" : "inactive",
    "aria-current": current ? ("page" as const) : undefined,
    className: cn(styles.trigger, classNames?.root, className),
  };
  const content = (
    <>
      {icon}
      {children}
      {count != null && (
        <span data-slot="tabs-count" className={cn(styles.count, classNames?.count)}>
          {count}
        </span>
      )}
    </>
  );
  if (href && !disabled)
    return (
      <a
        {...shared}
        href={href}
        onClick={(event) => {
          onClick?.(event as never);
          if (!event.defaultPrevented) nav?.select(value);
        }}
      >
        {content}
      </a>
    );
  return (
    <button
      {...props}
      {...shared}
      type="button"
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) nav?.select(value);
      }}
    >
      {content}
    </button>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      data-slot="tabs-content"
      className={cn("rounded-chip data-[state=active]:animate-enter-fade", className)}
      {...props}
    />
  );
}

export default Tabs;
