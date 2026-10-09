"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusAfterRemoval } from "@/lib/focus";

/** A value inside a field (a tag, a chosen option) with its remove button. */
export function FieldChip({
  children,
  onRemove,
  removeLabel,
  active,
  disabled,
  invalid,
  className,
  textClassName,
  removeClassName,
  flip,
}: {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel: string;
  active?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  textClassName?: string;
  removeClassName?: string;
  /** A stable key: the chip grows in, slides and leaves a ghost inside a container that runs useFlip. */
  flip?: string;
}) {
  return (
    <span
      data-slot="field-chip"
      data-flip={flip}
      data-active={active ? "" : undefined}
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 rounded-chip bg-hover-2 ps-2 text-xs text-ink",
        !onRemove && "pe-2",
        active && "shadow-[inset_0_0_0_1px_var(--pui-accent)]",
        invalid && "bg-red-tint text-red",
        className,
      )}
    >
      <span data-slot="field-chip-text" className={cn("truncate", textClassName)}>
        {children}
      </span>
      {onRemove && (
        <button
          data-slot="field-chip-remove"
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={removeLabel}
          onClick={(e) => {
            e.stopPropagation();
            const chip = e.currentTarget.closest("[data-slot=field-chip]");
            focusAfterRemoval(chip, { scope: chip?.closest("[data-slot=field-control]") });
            onRemove();
          }}
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-[calc(var(--pui-radius-chip)-2px)] text-ink-3 hover:bg-hover hover:text-ink",
            removeClassName,
          )}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
