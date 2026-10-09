"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { AnimatePresence, LazyMotion, m, spring } from "motion/react";
import { animate } from "motion/mini";
import * as Slot from "@radix-ui/react-slot";
import { Spinner } from "@/components/spinner/spinner";
import type { BuiltInLook as Look } from "@/runtime/preset";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useMotionTokens } from "@/hooks/use-motion-tokens";
import { cn } from "@/lib/utils";
import styles from "./button.module.css";

export type { ButtonVariant, ButtonSize, ButtonTone } from "./button-variants";
export { buttonPaint, buttonClassName } from "./button-variants";
import { buttonClassName, type ButtonVariant, type ButtonSize, type ButtonTone } from "./button-variants";
import type { ButtonDefaults } from "./defaults";
export type { ButtonDefaults } from "./defaults";
import { useComponentDefaults } from "@/runtime/appearance";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";

type NativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationStart"
>;

export interface ButtonProps extends NativeProps {
  /** Visual weight: primary (ink-filled), secondary, outline, ghost, danger, or accent (filled with the brand). */
  variant?: ButtonVariant;
  /** Height 32 / 36 / 40 px; touch 44 px for a bottom action bar on a phone. */
  size?: ButtonSize;
  /** Market side. On primary/accent the fill becomes --pui-up (buy) or --pui-down (sell); on the quiet variants the
   *  label takes that colour. Pair it with a word or arrow: colour is never the only signal. */
  tone?: ButtonTone;
  /** Shows a loader in front of the label, sets aria-busy and ignores clicks; size and focus stay. */
  loading?: boolean;
  classNames?: Partial<Record<"root" | "label" | "loader", string>>;
  /** Paint this button in another look than the one in force around it (DESIGN-LANGUAGE.md "Looks"). */
  look?: Look;
  /** Render the single child (a link, a Radix trigger) with the button's look instead of a <button>. */
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

// Motion's animation features arrive in a deferred chunk (AT11): the button renders and works at once, and its press,
// loader and label motion run once they land, a frame or two after mount. Buttons that mount after that get the
// loaded features directly, so they render once instead of again when a lazy load resolves.
type Features = typeof import("./motion-features").default;
let loaded: Features | null = null;
const features = () =>
  import("./motion-features").then((module) => {
    loaded = module.default;
    return loaded;
  });

/** Children with fragments opened up, so `{busy ? <><Icon />Saving</> : …}` reads as icon plus text. */
const flat = (children: ReactNode): ReactNode[] =>
  Children.toArray(children).flatMap((c) =>
    isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment ? flat(c.props.children) : [c],
  );

/** Splits children into the text run (the label that can change) and everything else (icons), in order. */
function split(children: ReactNode) {
  const parts = flat(children);
  const text = parts
    .filter((p) => typeof p === "string" || typeof p === "number")
    .join("")
    .trim();
  const firstText = parts.findIndex((p) => typeof p === "string" || typeof p === "number");
  const before = firstText === -1 ? parts : parts.slice(0, firstText).filter(isValidElement);
  const after = firstText === -1 ? [] : parts.slice(firstText).filter(isValidElement);
  return { text, before, after };
}

/**
 * The action control. Hover answers at once and lets go over --pui-motion-out; a press scales down at once (never on a
 * trigger that anchors a floating layer, which would measure a shrunken box); a changed label slides in while the
 * width follows on a critically damped spring; loading keeps the size and the focus.
 */
export function Button({
  variant: variantProp,
  size: sizeProp,
  tone: toneProp,
  loading = false,
  look,
  asChild = false,
  className,
  classNames,
  children,
  type,
  onClick,
  onPointerMove,
  onPointerDown,
  disabled,
  ref,
  ...props
}: ButtonProps) {
  const defaults = useComponentDefaults<ButtonDefaults>("button", ["variant", "size", "tone"]);
  const variant = variantProp ?? defaults.variant ?? "primary";
  const size = sizeProp ?? defaults.size ?? "md";
  const tone = toneProp ?? defaults.tone;
  const host = useRef<HTMLButtonElement>(null);
  const attach = useComposedRef(host, ref);
  const motionTokens = useMotionTokens(host);
  const requestedReduced = useReducedMotionSafe();
  const reduced = requestedReduced || motionTokens.reduced;
  // Reduced motion keeps a restrained fade; none removes it (APPEARANCE A06).
  const fade = motionTokens.mode === "none" ? 0 : motionTokens.fade.in;
  // a caller's aria-disabled keeps the button focusable (focus never drops after Save resolves) but inert to presses
  const softDisabled = props["aria-disabled"] === true || props["aria-disabled"] === "true";
  const { text, before, after } = split(children);
  const prism = usePrismLight(host, variant === "primary" || variant === "accent", `${text}|${tone}|${variant}`);
  // with asChild the text sits inside the child (the link), not among our own children
  const inner = asChild && isValidElement<{ children?: ReactNode }>(children) ? split(children.props.children) : null;
  const iconOnly = inner ? !inner.text : !text;
  const anchor =
    (props["aria-haspopup"] != null && props["aria-haspopup"] !== false && props["aria-haspopup"] !== "false") ||
    "data-state" in props;
  const shared = {
    "data-slot": "button",
    "data-variant": variant,
    "data-size": size,
    "data-tone": tone,
    "data-icon-only": iconOnly ? "" : undefined,
    "data-loading": loading ? "" : undefined,
    "data-look": look,
    className: buttonClassName({ variant, size, tone, className: cn(classNames?.root, className) }),
  };

  if (asChild)
    return (
      <Slot.Root {...shared} {...props} ref={attach}>
        {children}
      </Slot.Root>
    );

  const button = (
    <m.button
      ref={attach}
      type={type ?? "button"}
      {...shared}
      {...props}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || softDisabled || undefined}
      onPointerMove={(e) => {
        prism.turn(e);
        onPointerMove?.(e);
      }}
      onPointerDown={(e) => {
        prism.press();
        onPointerDown?.(e);
      }}
      onClick={(e) => {
        if (loading || softDisabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      whileTap={
        reduced || anchor || disabled || loading || softDisabled
          ? undefined
          : { scale: motionTokens.pressScale, transition: { duration: 0 } }
      }
      transition={{ scale: motionTokens.spring.snappy }}
    >
      <AnimatePresence initial={false}>
        {loading && (
          <m.span
            key="loader"
            data-slot="button-loader"
            className={cn(styles.loader, classNames?.loader)}
            initial={reduced ? { opacity: 0 } : { width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { width: 0, opacity: 0 }}
            transition={{ duration: reduced ? fade : motionTokens.duration.standard, ease: motionTokens.ease.default }}
          >
            <Spinner size="sm" label="Working" className={styles.spinner} />
          </m.span>
        )}
      </AnimatePresence>
      {iconOnly ? !loading && before : before}
      {!iconOnly && (
        <Label text={text} reduced={!!reduced} fade={fade} motionTokens={motionTokens} className={classNames?.label} />
      )}
      {after}
    </m.button>
  );
  return <LazyMotion features={loaded ?? features}>{button}</LazyMotion>;
}

/**
 * The main action's light inside the glass, in a look that draws one (prism): its own angle from the start, turned by
 * where the pointer is across the face, a new angle at every press, and a sweep of split light (data-shift) when the
 * button's word, tone or variant changes after it first appears. Writes two style properties and one attribute on the
 * button; nothing runs at rest. Looks without this light ignore all three.
 */
function usePrismLight(host: RefObject<HTMLButtonElement | null>, solid: boolean, state: string) {
  const frame = useRef(0);
  const shown = useRef(state);
  const ending = useRef(0);
  useLayoutEffect(() => {
    const el = host.current;
    if (el && solid) el.style.setProperty("--m-prism-seed", Math.random().toFixed(3));
  }, [host, solid]);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el || !solid || shown.current === state) return;
    shown.current = state;
    // restart the sweep if it is still running
    delete el.dataset.shift;
    void el.offsetWidth;
    el.dataset.shift = "";
    clearTimeout(ending.current);
    ending.current = window.setTimeout(() => delete el.dataset.shift, 1200);
  }, [host, solid, state]);
  useLayoutEffect(
    () => () => {
      clearTimeout(ending.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  return {
    turn: (e: PointerEvent<HTMLButtonElement>) => {
      if (!solid || e.pointerType !== "mouse" || frame.current) return;
      const el = e.currentTarget;
      const x = e.clientX;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const r = el.getBoundingClientRect();
        if (r.width) el.style.setProperty("--m-prism-x", ((x - r.left) / r.width).toFixed(3));
      });
    },
    press: () => {
      if (solid) host.current?.style.setProperty("--m-prism-seed", Math.random().toFixed(3));
    },
  };
}

/** The text run. When it changes, the old words leave upward and the new ones rise in, while the width moves from the
 *  old measure to the new one; no measuring happens while the label is unchanged. */
function Label({
  text,
  reduced,
  fade,
  motionTokens,
  className,
}: {
  text: string;
  reduced: boolean;
  /** Seconds of the label crossfade under reduced motion (0 under none). */
  fade: number;
  /** The button's own, resolved at the button: the label sits inside it, in the same look and motion. */
  motionTokens: ReturnType<typeof useMotionTokens>;
  className?: string;
}) {
  const slot = useRef<HTMLSpanElement>(null);
  const latest = useRef(motionTokens);
  useLayoutEffect(() => {
    latest.current = motionTokens;
  }, [motionTokens]);
  const last = useRef<{ text: string; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return;
    const prev = last.current;
    // first mount: read the width after paint, when layout is already clean, instead of forcing a layout per button
    if (!prev) {
      last.current = { text, width: Number.NaN };
      const id = requestAnimationFrame(() => {
        if (last.current?.text === text) last.current = { text, width: el.getBoundingClientRect().width };
      });
      return () => cancelAnimationFrame(id);
    }
    el.style.width = "";
    const width = el.getBoundingClientRect().width;
    last.current = { text, width };
    // a label that is not rendered (a hidden toolbar on a phone) has nothing to animate
    if (prev.text === text || reduced || Number.isNaN(prev.width) || !el.getClientRects().length) return;
    // The same spring, played natively: motion/mini samples the generator into a linear() easing.
    const { visualDuration, bounce } = latest.current.spring.morph;
    const run = animate(el, { width: [`${prev.width}px`, `${width}px`] }, { type: spring, visualDuration, bounce });
    run.then(() => {
      el.style.width = "";
    });
    // cancel, not stop: stop commits the running value, which throws once the element stops being rendered, and the
    // next change measures afresh anyway
    return () => {
      run.cancel();
      el.style.width = "";
    };
  }, [text, reduced]);
  return (
    <span ref={slot} data-slot="button-label" className={cn(styles.label, className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={text}
          className={styles.text}
          initial={
            reduced ? { opacity: 0 } : { opacity: 0, y: "0.45em", filter: `blur(${motionTokens.blur.subtle}px)` }
          }
          animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
          exit={
            reduced
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  y: "-0.45em",
                  filter: `blur(${motionTokens.blur.subtle}px)`,
                  transition: { duration: motionTokens.duration.fast },
                }
          }
          transition={{ duration: reduced ? fade : motionTokens.duration.standard, ease: motionTokens.ease.default }}
        >
          {text}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

export default Button;
