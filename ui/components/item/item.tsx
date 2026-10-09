"use client";

import type { CSSProperties, ComponentProps } from "react";

import { useComponentDefaults } from "@/runtime/appearance";
import type { ItemDefaults } from "./defaults";
export type { ItemDefaults } from "./defaults";

import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import styles from "./item.module.css";

export interface ItemClassNames {
  root?: string;
  main?: string;
  media?: string;
  text?: string;
  title?: string;
  description?: string;
  meta?: string;
  actions?: string;
}

export interface ItemProps {
  title: ReactNode;
  description?: ReactNode;
  /** Icon tile, avatar or thumbnail on the start side. */
  media?: ReactNode;
  /** Right-aligned meta: time, count, status. */
  meta?: ReactNode;
  /** Trailing controls. Clicks inside do not trigger the row. */
  actions?: ReactNode;
  href?: string;
  onSelect?: () => void;
  selected?: boolean;
  variant?: "plain" | "outline" | "card";
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
  classNames?: ItemClassNames;
  ref?: Ref<HTMLDivElement>;
}

const VARIANT: Record<NonNullable<ItemProps["variant"]>, string | undefined> = {
  plain: undefined,
  outline: styles.outline,
  card: styles.card,
};

/**
 * The generic list row every list is built from: media, title, description, meta and actions. It becomes a link or a
 * button when given `href` / `onSelect`, keeping trailing actions separately focusable.
 */
export function Item({
  title,
  description,
  media,
  meta,
  actions,
  href,
  onSelect,
  selected,
  variant: variantProp,
  size: sizeProp,
  className,
  style,
  classNames,
  ref,
}: ItemProps) {
  const scopeDefaults = useComponentDefaults<ItemDefaults>("item", ["variant", "size"]);
  const variant = variantProp ?? scopeDefaults.variant ?? "plain";
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  const interactive = !!(href || onSelect);
  const body = (
    <>
      {media && (
        <span data-slot="item-media" className={cn(styles.media, classNames?.media)}>
          {media}
        </span>
      )}
      <span className={cn(styles.text, classNames?.text)} data-slot="item-text">
        <span data-slot="item-title" className={cn(styles.title, classNames?.title)}>
          {title}
        </span>
        {description && (
          <span data-slot="item-description" className={cn(styles.description, classNames?.description)}>
            {description}
          </span>
        )}
      </span>
      {meta && (
        <span data-slot="item-meta" className={cn(styles.meta, classNames?.meta)}>
          {meta}
        </span>
      )}
    </>
  );
  return (
    <div
      ref={ref}
      style={style}
      data-slot="item"
      data-variant={variant}
      data-state={selected ? "selected" : undefined}
      data-interactive={interactive || undefined}
      className={cn(styles.root, VARIANT[variant], size === "sm" && styles.sm, classNames?.root, className)}
    >
      {href ? (
        <a
          href={href}
          className={cn(styles.main, classNames?.main)}
          data-slot="item-main"
          aria-current={selected ? "page" : undefined}
        >
          {body}
        </a>
      ) : onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={cn(styles.main, classNames?.main)}
          data-slot="item-main"
        >
          {body}
        </button>
      ) : (
        <div className={cn(styles.main, classNames?.main)} data-slot="item-main">
          {body}
        </div>
      )}
      {actions && (
        <span data-slot="item-actions" className={cn(styles.actions, classNames?.actions)}>
          {actions}
        </span>
      )}
    </div>
  );
}

export type ItemIconTone = "neutral" | "accent" | "green" | "orange" | "red" | "blue" | "violet";

/** A tinted tile behind an icon — the default media for items. Its corner follows the look's control radius. */
export function ItemIcon({
  children,
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: ItemIconTone }) {
  return (
    <span {...props} data-slot="item-icon" data-tone={tone} className={cn(styles.icon, className)}>
      {children}
    </span>
  );
}

export default Item;
