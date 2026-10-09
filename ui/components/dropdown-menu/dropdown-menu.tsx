"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { DropdownMenuDefaults } from "./defaults";
export type { DropdownMenuDefaults } from "./defaults";

import type { CSSProperties, Ref, ReactElement, ReactNode } from "react";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/button/button";
import {
  MenuItems,
  MenuSurface,
  useMenuDirection,
  type MenuItem,
  type MenuClassNames,
} from "@/components/_shared/menu";
import { cn } from "@/lib/utils";
import { usePortalContainer } from "@/runtime/appearance";

export type { MenuItem, MenuClassNames };

export interface DropdownMenuProps {
  /** The menu's name: the trigger's text, or its accessible name when the trigger is an icon. */
  label: string;
  items: MenuItem[];
  /** An icon for the built-in trigger (MoreHorizontal for row actions); with it the trigger shows only the icon, and
   *  label becomes its accessible name, unless showLabel is set. */
  icon?: ReactNode;
  showLabel?: boolean;
  /** Your own trigger (a Button, an avatar); it receives the open state and keyboard handling. */
  trigger?: ReactElement;
  variant?: ButtonVariant;
  size?: ButtonSize;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  classNames?: MenuClassNames;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
  dir?: "ltr" | "rtl";
}

/**
 * A list of actions behind a trigger: row actions, "More", an account menu. One highlight plate glides between rows
 * under the pointer and jumps with the keyboard; type to jump to an item; → opens a submenu.
 */
export function DropdownMenu({
  label,
  items,
  icon,
  showLabel = false,
  trigger,
  variant: variantProp,
  size: sizeProp,
  align: alignProp,
  side = "bottom",
  open,
  defaultOpen,
  onOpenChange,
  className,
  classNames,
  style,
  ref,
  dir: direction,
}: DropdownMenuProps) {
  const scopeDefaults = useComponentDefaults<DropdownMenuDefaults>("dropdown-menu", ["variant", "size", "align"]);
  const variant = variantProp ?? scopeDefaults.variant ?? "ghost";
  const size = sizeProp ?? scopeDefaults.size ?? "sm";
  const align = alignProp ?? scopeDefaults.align ?? "end";

  const container = usePortalContainer();
  const iconOnly = !!icon && !showLabel;
  const { dir, triggerProps } = useMenuDirection(direction);
  return (
    <RadixMenu.Root dir={dir} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <RadixMenu.Trigger asChild data-slot="dropdown-menu-trigger" className={classNames?.trigger} {...triggerProps}>
        {trigger ?? (
          <Button
            data-slot="dropdown-menu-trigger"
            variant={variant}
            size={size}
            aria-label={iconOnly ? label : undefined}
          >
            {icon}
            {!iconOnly && label}
          </Button>
        )}
      </RadixMenu.Trigger>
      {container !== null && (
        <RadixMenu.Portal container={container}>
          <MenuSurface
            kit={RadixMenu}
            label={label}
            align={align}
            side={side}
            sideOffset={6}
            className={cn(classNames?.root, className)}
            classNames={classNames}
            style={style}
            ref={ref}
          >
            <MenuItems kit={RadixMenu} items={items} container={container} classNames={classNames} />
          </MenuSurface>
        </RadixMenu.Portal>
      )}
    </RadixMenu.Root>
  );
}

export default DropdownMenu;
