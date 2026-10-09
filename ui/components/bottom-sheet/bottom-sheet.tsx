"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
  type Ref,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Button } from "@/components/button/button";
import { useReturnFocus } from "@/components/_shared/use-return-focus";
import { usePortalContainer } from "@/runtime/appearance";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useResolvedAppearance } from "@/hooks/use-resolved-appearance";
import { motionEase } from "@/lib/motion-tokens";
import { semanticMotion } from "@/lib/motion-source";
import { cn } from "@/lib/utils";
import overlay from "@/components/_shared/overlay.module.css";

export interface BottomSheetProps {
  /** An element that opens it (uncontrolled use). */
  trigger?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  /** Resting heights as fractions of the screen, lowest first. Default [0.45, 0.92]. */
  detents?: number[];
  /** Which resting height it opens at. Default 0. */
  initialDetent?: number;
  onDetentChange?: (index: number) => void;
  closeLabel?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
  classNames?: Partial<
    Record<"root" | "backdrop" | "header" | "handle" | "title" | "description" | "close" | "body", string>
  >;
  children?: ReactNode;
}

const EASE = [0.32, 0.72, 0, 1] as const; // --pui-ease-drawer

/**
 * A phone panel that rests at a peek and follows the finger to full height. Drag the handle (or the header) between
 * resting heights; a flick down from the lowest closes it. The handle is a button: Enter cycles heights, ↑ ↓ move.
 * Escape, the scrim and Close also close it, sliding away first.
 */
export function BottomSheet({
  trigger,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  title,
  description,
  detents = [0.45, 0.92],
  initialDetent = 0,
  onDetentChange,
  closeLabel = "Close",
  className,
  classNames,
  style,
  ref,
  children,
}: BottomSheetProps) {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const setOpen = (o: boolean) => {
    if (openProp === undefined) setInner(o);
    onOpenChange?.(o);
  };
  const container = usePortalContainer();
  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      {container !== null && (
        <RadixDialog.Portal container={container}>
          <Panel
            title={title}
            description={description}
            detents={detents}
            initialDetent={initialDetent}
            onDetentChange={onDetentChange}
            closeLabel={closeLabel}
            className={className}
            classNames={classNames}
            style={style}
            ref={ref}
            onClosed={() => setOpen(false)}
          >
            {children}
          </Panel>
        </RadixDialog.Portal>
      )}
    </RadixDialog.Root>
  );
}

function Panel({
  title,
  description,
  detents,
  initialDetent,
  onDetentChange,
  closeLabel,
  className,
  classNames,
  style,
  ref,
  onClosed,
  children,
}: Required<Pick<BottomSheetProps, "title" | "detents" | "initialDetent" | "closeLabel">> &
  Pick<
    BottomSheetProps,
    "description" | "onDetentChange" | "className" | "classNames" | "style" | "ref" | "children"
  > & { onClosed: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const attach = useComposedRef(host, ref);
  const appearance = useResolvedAppearance(host, { times: ["duration-considered"], easings: ["ease-drawer"] });
  const entered = useRef(false);
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  const maxH = Math.round(vh * detents[detents.length - 1]);
  const yOf = (i: number) => maxH - Math.round(vh * detents[i]);
  const [detent, setDetent] = useState(Math.min(initialDetent, detents.length - 1));
  const y = useMotionValue(maxH);
  const scrim = useTransform(y, [yOf(0), maxH], [1, 0]);
  const drag = useRef<{ start: number; from: number; last: number; t: number; v: number } | null>(null);
  const header = useRef<HTMLDivElement>(null);
  const focus = useReturnFocus();
  const [headerH, setHeaderH] = useState(76);
  useLayoutEffect(() => {
    const element = header.current;
    if (!element) return;
    const measure = () => setHeaderH(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const go = (target: number, after?: () => void) => {
    const run = animate(y, target, {
      duration: appearance.reducedMotion
        ? 0
        : (appearance.times["duration-considered"] ?? semanticMotion.duration.considered),
      ease: motionEase(appearance.easings["ease-drawer"], EASE),
    });
    if (after) run.then(after);
  };
  const settle = (i: number) => {
    setDetent(i);
    onDetentChange?.(i);
    go(yOf(i));
  };
  const close = () => go(maxH, onClosed);
  useLayoutEffect(() => {
    if (!appearance.ready || entered.current) return;
    entered.current = true;
    y.set(maxH);
    go(yOf(detent));
  }, [appearance.ready]); // eslint-disable-line react-hooks/exhaustive-deps -- slide in once
  useEffect(() => {
    if (!drag.current) y.set(yOf(detent));
  }, [vh]); // eslint-disable-line react-hooks/exhaustive-deps -- keep the resting height on rotation

  const onDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button:not([data-handle]), a, input, textarea, select"))
      return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: e.clientY, from: y.get(), last: e.clientY, t: performance.now(), v: 0 };
  };
  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    d.v = (e.clientY - d.last) / Math.max(1, now - d.t);
    d.last = e.clientY;
    d.t = now;
    const next = d.from + (e.clientY - d.start);
    y.set(next < 0 ? next * 0.2 : next); // resist past the top
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || Math.abs(d.last - d.start) < 4) return;
    const projected = y.get() + d.v * 180;
    if (projected > yOf(0) + (maxH - yOf(0)) * 0.5 || (d.v > 0.9 && detentAt(y.get()) === 0)) {
      close();
      return;
    }
    settle(detentAt(projected));
  };
  const detentAt = (pos: number) =>
    detents.reduce((best, _, i) => (Math.abs(yOf(i) - pos) < Math.abs(yOf(best) - pos) ? i : best), 0);

  return (
    <>
      <RadixDialog.Overlay asChild>
        <motion.div
          data-slot="bottom-sheet-backdrop"
          className={cn(overlay.scrim, "!animate-none", classNames?.backdrop)}
          style={{ opacity: scrim }}
          onPointerDown={(e) => {
            e.preventDefault();
            close();
          }}
        />
      </RadixDialog.Overlay>
      <RadixDialog.Content
        asChild
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          close();
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        {...focus}
      >
        <motion.div
          ref={attach}
          data-slot="bottom-sheet"
          style={{ y, height: maxH, ...style }}
          // at a lower detent part of the sheet is below the screen: a control focused down there raises the sheet
          onFocusCapture={(e) => {
            const last = detents.length - 1;
            if (
              detent < last &&
              !drag.current &&
              (e.target as HTMLElement).getBoundingClientRect().bottom - e.currentTarget.getBoundingClientRect().top >
                Math.round(vh * detents[detent])
            )
              settle(last);
          }}
          className={cn(
            "m-overlay fixed inset-x-0 bottom-0 z-[var(--pui-z-modal)] mx-auto flex max-w-[640px] flex-col rounded-t-[var(--pui-radius-window)] text-ink outline-none",
            classNames?.root,
            className,
          )}
        >
          <div
            ref={header}
            data-slot="bottom-sheet-header"
            className={cn("shrink-0 cursor-grab touch-none select-none active:cursor-grabbing", classNames?.header)}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <button
              type="button"
              data-slot="bottom-sheet-handle"
              data-handle
              aria-label={detent === detents.length - 1 ? "Collapse sheet" : "Expand sheet"}
              onClick={() => settle((detent + 1) % detents.length)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  settle(Math.min(detents.length - 1, detent + 1));
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (detent === 0) close();
                  else settle(detent - 1);
                }
              }}
              className={cn("mx-auto mt-2 mb-1 grid h-5 w-16 place-items-center rounded-pill", classNames?.handle)}
            >
              <span className="h-1 w-9 rounded-pill bg-line-strong" />
            </button>
            <div className="flex items-start gap-3 px-[var(--pui-pad-panel)] pb-3">
              <div className="min-w-0 flex-1">
                <RadixDialog.Title
                  data-slot="bottom-sheet-title"
                  className={cn("text-subheading leading-snug text-ink", classNames?.title)}
                >
                  {title}
                </RadixDialog.Title>
                {description ? (
                  <RadixDialog.Description
                    data-slot="bottom-sheet-description"
                    className={cn("text-sm text-ink-2", classNames?.description)}
                  >
                    {description}
                  </RadixDialog.Description>
                ) : (
                  <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
                )}
              </div>
              <Button
                data-slot="bottom-sheet-close"
                variant="ghost"
                size="sm"
                onClick={close}
                aria-label={closeLabel}
                className={cn("-me-1", classNames?.close)}
              >
                <X />
              </Button>
            </div>
          </div>
          <div
            data-slot="bottom-sheet-body"
            className={cn("min-h-0 overflow-y-auto overscroll-contain border-t border-line-soft", classNames?.body)}
            style={{ height: Math.round(vh * detents[detent]) - headerH }}
          >
            {children}
          </div>
        </motion.div>
      </RadixDialog.Content>
    </>
  );
}

export default BottomSheet;
