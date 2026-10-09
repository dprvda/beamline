"use client";

import type { ComponentProps } from "react";
import * as RadixLabel from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export interface LabelProps extends ComponentProps<typeof RadixLabel.Root> {
  /** Shows the marker and announces "required". */
  required?: boolean;
  /** The control says "required" itself (a native required input, a radiogroup with aria-required): the label shows
   * the marker only, so the control's name stays the label's words and the state is announced once. */
  requiredOnControl?: boolean;
}

/** The text label tied to a form control. It dims with a disabled control next to it (peer) or inside it (group). */
export function Label({ required = false, requiredOnControl = false, className, children, ...props }: LabelProps) {
  return (
    <RadixLabel.Root
      data-slot="label"
      {...props}
      className={cn(
        "inline-flex items-center gap-[var(--pui-space-1)] text-sm leading-tight font-medium text-ink select-none group-data-[disabled]:opacity-[var(--pui-opacity-disabled)] peer-disabled:opacity-[var(--pui-opacity-disabled)]",
        className,
      )}
    >
      {children}
      {required && (
        <>
          <span aria-hidden className="text-red">
            *
          </span>
          {!requiredOnControl && <span className="sr-only">required</span>}
        </>
      )}
    </RadixLabel.Root>
  );
}

export default Label;
