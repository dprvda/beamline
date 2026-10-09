"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/button/button";
import * as RadixDialog from "@radix-ui/react-dialog";
import { useReturnFocus } from "@/components/_shared/use-return-focus";
import { useOpenFrom } from "@/components/_shared/use-open-from";
import { usePortalContainer, useComponentDefaults } from "@/runtime/appearance";
import type { DialogDefaults } from "./defaults";
export type { DialogDefaults } from "./defaults";
import { cn } from "@/lib/utils";
import overlay from "@/components/_shared/overlay.module.css";

/** A focused task over the page: create, invite, rename. open / defaultOpen / onOpenChange. */
export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

const WIDTH = { sm: "380px", md: "440px", lg: "560px", xl: "720px" } as const;

export interface DialogContentProps extends Omit<ComponentProps<typeof RadixDialog.Content>, "title"> {
  /** The task, as a heading; also the dialog's accessible name. */
  title: ReactNode;
  /** One or two lines under the title. */
  description?: ReactNode;
  /** 380 / 440 / 560 / 720 px wide. */
  size?: keyof typeof WIDTH;
  /** The × in the corner. Default true. */
  showClose?: boolean;
  /** Close on Escape and on a click outside. Set false while work is running that must not be abandoned (and hide
   *  the × with showClose={false}); Cancel and Done stay yours to offer. Default true. */
  dismissible?: boolean;
  /** Buttons at the bottom; DialogFooter lays them out the same everywhere. */
  footer?: ReactNode;
  classNames?: Partial<
    Record<"root" | "scrim" | "header" | "title" | "description" | "body" | "footer" | "close", string>
  >;
}

/**
 * The dialog surface: scrim, title, description, body and footer. Focus moves in (to the first field, or an autoFocus
 * one), is trapped while open and returns to the trigger on close.
 */
export function DialogContent({
  title,
  description,
  size: sizeProp,
  showClose = true,
  dismissible = true,
  footer,
  className,
  classNames,
  children,
  style,
  onPointerDownOutside,
  onEscapeKeyDown,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ref,
  ...props
}: DialogContentProps) {
  const openFrom = useOpenFrom(ref);
  const defaults = useComponentDefaults<DialogDefaults>("dialog", ["size"]);
  const size = sizeProp ?? defaults.size ?? "md";
  const container = usePortalContainer();
  const focus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus });
  if (container === null) return null;
  return (
    <RadixDialog.Portal container={container}>
      <RadixDialog.Overlay data-slot="dialog-scrim" className={cn(overlay.scrim, classNames?.scrim)} />
      <RadixDialog.Content
        ref={openFrom}
        data-slot="dialog"
        className={cn(overlay.dialog, "flex flex-col gap-4 p-[var(--pui-pad-panel)]", classNames?.root, className)}
        style={{ "--_dialog-width": WIDTH[size], ...style } as CSSProperties}
        onPointerDownOutside={(e) => {
          if (!dismissible) e.preventDefault();
          onPointerDownOutside?.(e);
        }}
        onEscapeKeyDown={(e) => {
          if (!dismissible) e.preventDefault();
          onEscapeKeyDown?.(e);
        }}
        {...focus}
        {...props}
      >
        <div data-slot="dialog-header" className={cn("grid shrink-0 gap-1 pe-8", classNames?.header)}>
          <RadixDialog.Title
            data-slot="dialog-title"
            className={cn("text-subheading leading-snug text-ink", classNames?.title)}
          >
            {title}
          </RadixDialog.Title>
          {description ? (
            <RadixDialog.Description
              data-slot="dialog-description"
              className={cn("text-body-sm text-ink-2", classNames?.description)}
            >
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">
              {typeof title === "string" ? title : "Dialog"}
            </RadixDialog.Description>
          )}
        </div>
        {/* the body scrolls alone so the header and the footer's actions stay on screen; its 4px bleed keeps a field's
            focus halo from being cut off by the scroll box */}
        <div data-slot="dialog-body" className={cn("-m-1 grid min-h-0 gap-4 overflow-y-auto p-1", classNames?.body)}>
          {children}
        </div>
        {footer && <DialogFooter className={cn("shrink-0", classNames?.footer)}>{footer}</DialogFooter>}
        {showClose && (
          <RadixDialog.Close asChild>
            <Button
              data-slot="dialog-close"
              variant="ghost"
              size="sm"
              aria-label="Close"
              className={cn("absolute end-3 top-3", classNames?.close)}
            >
              <X className="size-4" />
            </Button>
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/** The action row: secondary actions first, the main action last, aligned to the end. */
export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-1 flex flex-wrap items-center justify-end gap-2", className)}
      {...props}
    />
  );
}

export default Dialog;
