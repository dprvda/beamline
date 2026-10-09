"use client";

import {
  Fragment,
  useCallback,
  useRef,
  useState,
  type ComponentType,
  type FocusEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Check, ChevronRight } from "lucide-react";
import { useDirection } from "@radix-ui/react-direction";
import { cn } from "@/lib/utils";
import { useComposedRef } from "@/hooks/use-composed-ref";
import overlay from "./overlay.module.css";

export interface MenuClassNames {
  root?: string;
  trigger?: string;
  content?: string;
  submenu?: string;
  indicator?: string;
  item?: string;
  label?: string;
  shortcut?: string;
  check?: string;
  separator?: string;
  heading?: string;
  chevron?: string;
}

/** One row of any menu in the system (dropdown, context menu, menu bar). The same data renders the same everywhere. */
export interface MenuItem {
  /** Stable key; the label is used when absent. */
  id?: string;
  label: ReactNode;
  icon?: ReactNode;
  /** A shortcut shown at the end, e.g. "⌘D". The app binds the key. */
  shortcut?: string;
  onSelect?: (event: Event) => void;
  disabled?: boolean;
  /** danger: a destructive action (red). */
  tone?: "danger";
  /** A line above this item. */
  separatorBefore?: boolean;
  /** A small heading above this item, starting a group. */
  heading?: string;
  /** A checkable item; shows a check when true. */
  checked?: boolean;
  /** checkbox (default when checked is set) stays open when toggled; radio is one of a set and closes the menu. */
  type?: "checkbox" | "radio";
  /** A submenu. */
  items?: MenuItem[];
}

type Part = ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- Radix menu namespaces share part names, not prop types
/** The Radix parts a menu needs; DropdownMenu, ContextMenu and Menubar all provide them. */
export interface MenuKit {
  Content: Part;
  SubContent: Part;
  Item: Part;
  CheckboxItem: Part;
  ItemIndicator: Part;
  Sub: Part;
  SubTrigger: Part;
  Separator: Part;
  Label: Part;
  Portal: Part;
}

/** The reading direction a menu should open in: an explicit one, else the direction in force around its trigger (read
 *  when the trigger mounts and again as it is pressed, right-clicked or keyed), else a Direction provider. Without it
 *  Radix falls back to "ltr", so a portalled menu on an RTL page reads left to right, opens submenus to the right and
 *  answers → instead of ←. Spread `triggerProps` on the Radix trigger and pass `dir` to the Radix root. */
export function useMenuDirection(explicit?: "ltr" | "rtl") {
  const provided = useDirection();
  const [around, setAround] = useState<"ltr" | "rtl">();
  const read = useCallback((el: Element | null) => {
    if (el) setAround(getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr");
  }, []);
  const measure = useCallback((e: { currentTarget: Element }) => read(e.currentTarget), [read]);
  return {
    dir: explicit ?? around ?? provided,
    triggerProps: {
      ref: read,
      onPointerDownCapture: measure,
      onKeyDownCapture: measure,
      onContextMenuCapture: measure,
    },
  };
}

/** The floating list: one surface and one highlight plate that glides between rows, under the pointer and the arrow
 *  keys alike. Extra props (align, side, sideOffset) go to the Radix content part. */
export function MenuSurface({
  kit,
  sub = false,
  label,
  className,
  classNames,
  children,
  ref,
  ...rest
}: {
  kit: MenuKit;
  sub?: boolean;
  label?: string;
  className?: string;
  classNames?: MenuClassNames;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
} & Record<string, unknown>) {
  const surface = useRef<HTMLDivElement | null>(null);
  // the portal's presence passes its own ref (it watches the exit animation); keep both
  const attach = useComposedRef(surface, ref);
  const [plate, setPlate] = useState<{ y: number; h: number; jump: boolean } | null>(null);
  const Part = sub ? kit.SubContent : kit.Content;
  return (
    <Part
      ref={attach}
      data-slot={sub ? "menu-submenu" : "menu"}
      aria-label={label}
      collisionPadding={8}
      loop
      {...(sub ? { sideOffset: 2, alignOffset: -4 } : {})}
      {...rest}
      className={cn(
        overlay.surface,
        overlay.menu,
        "relative min-w-[11rem]",
        sub ? classNames?.submenu : classNames?.content,
        className,
      )}
      // React events cross portals: only rows of this surface move its plate (a submenu has its own)
      onFocusCapture={(e: FocusEvent<HTMLDivElement>) => {
        const item = (e.target as HTMLElement).closest<HTMLElement>("[data-menu-item]");
        if (item && !surface.current?.contains(item)) return;
        if (!item) {
          setPlate((p) => (p ? { ...p, h: 0 } : p));
          return;
        }
        setPlate((p) => ({ y: item.offsetTop, h: item.offsetHeight, jump: !p?.h }));
      }}
      // while a submenu is open, its trigger keeps the plate
      onPointerLeave={() => {
        if (!surface.current?.querySelector(":scope > [data-menu-item][data-state=open]"))
          setPlate((p) => (p ? { ...p, h: 0 } : p));
      }}
    >
      <span
        aria-hidden
        data-slot="menu-indicator"
        className={cn(overlay.glide, classNames?.indicator)}
        data-on={plate?.h ? "" : undefined}
        data-jump={plate?.jump ? "" : undefined}
        style={plate ? { transform: `translateY(${plate.y}px)`, height: plate.h || undefined } : undefined}
      />
      {children}
    </Part>
  );
}

/** Rows for a MenuItem list, in any kit. */
export function MenuItems({
  kit,
  items,
  container,
  classNames,
}: {
  kit: MenuKit;
  items: MenuItem[];
  container?: HTMLElement | null;
  classNames?: MenuClassNames;
}) {
  return items.map((item, i) => {
    const tone = item.tone;
    const common = {
      "data-menu-item": "",
      "data-slot": "menu-item",
      "data-glide": "",
      "data-tone": tone,
      className: cn(overlay.item, classNames?.item),
      disabled: item.disabled,
    };
    const content = (
      <>
        {item.icon}
        <span data-slot="menu-label" dir="auto" className={cn("min-w-0 truncate", classNames?.label)}>
          {item.label}
        </span>
        {item.shortcut && (
          <span data-slot="menu-shortcut" dir="ltr" className={cn(overlay.shortcut, classNames?.shortcut)}>
            {item.shortcut}
          </span>
        )}
      </>
    );
    let node: ReactNode;
    if (item.items?.length) {
      node = (
        <kit.Sub>
          <kit.SubTrigger {...common}>
            {content}
            <ChevronRight data-slot="menu-chevron" className={cn("ms-auto rtl:rotate-180", classNames?.chevron)} />
          </kit.SubTrigger>
          {container !== null && (
            <kit.Portal container={container}>
              <MenuSurface kit={kit} sub classNames={classNames}>
                <MenuItems kit={kit} items={item.items} container={container} classNames={classNames} />
              </MenuSurface>
            </kit.Portal>
          )}
        </kit.Sub>
      );
    } else if (item.checked !== undefined && item.type === "radio") {
      node = (
        <kit.Item {...common} role="menuitemradio" aria-checked={item.checked} onSelect={item.onSelect}>
          {content}
          <span data-slot="menu-check" className={cn(overlay.check, classNames?.check)}>
            {item.checked && <Check />}
          </span>
        </kit.Item>
      );
    } else if (item.checked !== undefined) {
      node = (
        <kit.CheckboxItem
          {...common}
          checked={item.checked}
          onSelect={(e: Event) => {
            e.preventDefault();
            item.onSelect?.(e);
          }}
        >
          {content}
          <kit.ItemIndicator data-slot="menu-check" className={cn(overlay.check, classNames?.check)}>
            <Check />
          </kit.ItemIndicator>
        </kit.CheckboxItem>
      );
    } else {
      node = (
        <kit.Item {...common} onSelect={item.onSelect}>
          {content}
        </kit.Item>
      );
    }
    return (
      <Fragment key={item.id ?? (typeof item.label === "string" ? item.label : i)}>
        {item.separatorBefore && i > 0 && (
          <kit.Separator data-slot="menu-separator" className={cn(overlay.separator, classNames?.separator)} />
        )}
        {item.heading && (
          <kit.Label data-slot="menu-heading" className={cn(overlay.heading, classNames?.heading)}>
            {item.heading}
          </kit.Label>
        )}
        {node}
      </Fragment>
    );
  });
}
