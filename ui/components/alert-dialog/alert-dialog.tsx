"use client";

import type { ComponentProps, ReactNode } from "react";
import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import { Button, type ButtonVariant } from "@/components/button/button";
import { useReturnFocus } from "@/components/_shared/use-return-focus";
import { useOpenFrom } from "@/components/_shared/use-open-from";
import { usePortalContainer } from "@/runtime/appearance";
import { cn } from "@/lib/utils";
import overlay from "@/components/_shared/overlay.module.css";

/** A confirmation that must be answered. open / defaultOpen / onOpenChange. */
export const AlertDialog = RadixAlertDialog.Root;
export const AlertDialogTrigger = RadixAlertDialog.Trigger;

export interface AlertDialogClassNames {
  root?: string;
  scrim?: string;
  header?: string;
  title?: string;
  description?: string;
}

export interface AlertDialogContentProps extends Omit<ComponentProps<typeof RadixAlertDialog.Content>, "title"> {
  /** The question: "Revoke production-server?" */
  title: ReactNode;
  /** What happens, and whether it can be undone. */
  description: ReactNode;
  classNames?: AlertDialogClassNames;
}

/**
 * Blocking: the scrim does not dismiss it (Escape and Cancel do), and focus starts on the safe choice, Cancel. Put an
 * AlertDialogFooter with AlertDialogCancel then AlertDialogAction inside.
 */
export function AlertDialogContent({
  title,
  description,
  className,
  classNames,
  children,
  onCloseAutoFocus,
  ref,
  ...props
}: AlertDialogContentProps) {
  const openFrom = useOpenFrom(ref);
  const container = usePortalContainer();
  // focus starts on the safe choice, Cancel
  const focus = useReturnFocus({
    onOpenAutoFocus: (e) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-slot=alert-dialog-cancel]")?.focus();
    },
    onCloseAutoFocus,
  });
  if (container === null) return null;
  return (
    <RadixAlertDialog.Portal container={container}>
      <RadixAlertDialog.Overlay data-slot="alert-dialog-scrim" className={cn(overlay.scrim, classNames?.scrim)} />
      <RadixAlertDialog.Content
        ref={openFrom}
        data-slot="alert-dialog"
        className={cn(
          overlay.dialog,
          "grid gap-4 p-[var(--pui-pad-panel)] [--pui-dialog-width:400px]",
          classNames?.root,
          className,
        )}
        {...focus}
        {...props}
      >
        <div data-slot="alert-dialog-header" className={cn("grid gap-1.5", classNames?.header)}>
          <RadixAlertDialog.Title
            data-slot="alert-dialog-title"
            className={cn("text-subheading leading-snug text-ink", classNames?.title)}
          >
            {title}
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description
            data-slot="alert-dialog-description"
            className={cn("text-sm leading-relaxed text-ink-2", classNames?.description)}
          >
            {description}
          </RadixAlertDialog.Description>
        </div>
        {children}
      </RadixAlertDialog.Content>
    </RadixAlertDialog.Portal>
  );
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("mt-1 flex flex-wrap justify-end gap-2", className)}
      {...props}
    />
  );
}

/** The safe choice; it has focus when the dialog opens. */
export function AlertDialogCancel({ children = "Cancel", ...props }: ComponentProps<typeof RadixAlertDialog.Cancel>) {
  return (
    <RadixAlertDialog.Cancel asChild {...props}>
      <Button data-slot="alert-dialog-cancel" variant="secondary">
        {children}
      </Button>
    </RadixAlertDialog.Cancel>
  );
}

/** The consequential choice: danger for destructive actions, primary otherwise. Your onClick runs the operation; for
 *  async work call event.preventDefault() to keep the dialog open, show loading, and close it on success. */
export function AlertDialogAction({
  variant = "danger",
  loading,
  children,
  ...props
}: ComponentProps<typeof RadixAlertDialog.Action> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <RadixAlertDialog.Action asChild {...props}>
      <Button data-slot="alert-dialog-action" variant={variant} loading={loading}>
        {children}
      </Button>
    </RadixAlertDialog.Action>
  );
}

export default AlertDialog;
