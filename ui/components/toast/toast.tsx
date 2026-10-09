"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button } from "@/components/button/button";
import { Spinner } from "@/components/spinner/spinner";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { useAppearanceRoot } from "@/runtime/appearance";
import { resolveCssTime } from "@/lib/css-values";
import { focusAfterRemoval } from "@/lib/focus";
import { cn } from "@/lib/utils";
import styles from "./toast.module.css";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition = "bottom-right" | "bottom-left" | "bottom-center" | "top-right" | "top-left" | "top-center";

export interface ToastInput {
  /** Reuse an id to replace a toast instead of adding one. */
  id?: string;
  type?: ToastType;
  title: ReactNode;
  description?: ReactNode;
  /** One follow-up, e.g. Undo or Retry. Running it dismisses the toast. */
  action?: { label: string; onClick: () => void };
  /** ms on screen; Infinity keeps it until dismissed. Defaults: 4 s, warnings 6 s, errors 8 s, loading until updated. */
  duration?: number;
}
interface ToastRecord extends ToastInput {
  id: string;
  type: ToastType;
  version: number;
  leaving?: boolean;
}

const DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
  loading: Infinity,
};
const EXIT_MS = 200;
const PEEK = 10;
const GAP = 8;

interface ToastApi {
  toasts: ToastRecord[];
  /** Shows a toast and returns its id. */
  toast: (input: ToastInput) => string;
  /** Changes a toast in place (loading → success); its timer restarts. */
  update: (id: string, patch: Partial<ToastInput>) => void;
  /** Dismisses one toast, or all when no id is given. */
  dismiss: (id?: string) => void;
}
type ToastContext = ToastApi & { registerCard: (id: string, node: HTMLLIElement | null) => void };
const Ctx = createContext<ToastContext | null>(null);
let seq = 0;

/** Holds the toasts for everything inside it; put one ToastStack inside to show them. */
export function ToastStackProvider({ children, max = 20 }: { children: ReactNode; max?: number }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const cards = useRef(new Map<string, HTMLLIElement>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const scope = useAppearanceRoot();
  const reduced = useReducedMotionSafe();
  const registerCard = useCallback((id: string, node: HTMLLIElement | null) => {
    if (node) cards.current.set(id, node);
    else cards.current.delete(id);
  }, []);
  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );
  const toast = useCallback(
    (input: ToastInput) => {
      const id = input.id ?? `toast-${++seq}`;
      setToasts((list) =>
        [...list.filter((t) => t.id !== id), { type: "info" as ToastType, ...input, id, version: 0 }].slice(-max),
      );
      return id;
    },
    [max],
  );
  const update = useCallback(
    (id: string, patch: Partial<ToastInput>) =>
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, ...patch, version: t.version + 1 } : t))),
    [],
  );
  const dismiss = useCallback(
    (id?: string) => {
      const nodes = id
        ? [cards.current.get(id)].filter((node): node is HTMLLIElement => !!node)
        : [...cards.current.values()];
      const delay = nodes.length
        ? Math.max(
            ...nodes.map((node) =>
              node.closest("[data-slot=toast-stack]")?.hasAttribute("data-reduced")
                ? 0
                : resolveCssTime(node, "--pui-motion-out", EXIT_MS / 1000) * 1000,
            ),
          )
        : reduced
          ? 0
          : scope
            ? resolveCssTime(scope, "--pui-motion-out", EXIT_MS / 1000) * 1000
            : EXIT_MS;
      for (const node of nodes) {
        const stack = node.closest<HTMLElement>("[data-slot=toast-stack]");
        focusAfterRemoval(node, { scope: stack, fallback: stack });
      }
      setToasts((list) => list.map((t) => (!id || t.id === id ? { ...t, leaving: true } : t)));
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        setToasts((list) => list.filter((t) => !(t.leaving && (!id || t.id === id))));
      }, delay);
      timers.current.add(timer);
    },
    [scope, reduced],
  );
  const api = useMemo(
    () => ({ toasts, toast, update, dismiss, registerCard }),
    [toasts, toast, update, dismiss, registerCard],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** toast(), update() and dismiss() for the nearest ToastStackProvider. */
export function useToastStack(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useToastStack needs a <ToastStackProvider> above it.");
  return api;
}

export type ToastStackClassNames = Partial<
  Record<
    "root" | "list" | "toast" | "card" | "body" | "icon" | "content" | "title" | "description" | "action" | "close",
    string
  >
>;

export interface ToastStackProps {
  classNames?: ToastStackClassNames;
  ref?: Ref<HTMLElement>;
  style?: CSSProperties;
  /** The region's name for assistive tech. */
  label?: string;
  position?: ToastPosition;
  /** Position inside the nearest positioned parent instead of the viewport (a panel, a demo). */
  contained?: boolean;
  /** Cards visible while collapsed: the newest and the ones peeking behind it. */
  visibleToasts?: number;
  /** Alt+T moves focus to the newest toast. */
  hotkey?: boolean;
  className?: string;
}

/**
 * Short results of an action (saved, sent, failed with retry, undo), stacked at an edge. Pointing at or focusing the
 * stack fans the cards out and pauses their timers; Escape dismisses the focused one; a card can be swiped away.
 */
export function ToastStack({
  label = "Notifications",
  position = "bottom-right",
  contained = false,
  visibleToasts = 3,
  hotkey = true,
  className,
  classNames,
  ref,
  style,
}: ToastStackProps) {
  const { toasts, dismiss } = useToastStack();
  const { registerCard } = useContext(Ctx)!;
  const reduced = useReducedMotionSafe();
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [docHidden, setDocHidden] = useState(false);
  const region = useRef<HTMLElement>(null);
  const regionRef = useComposedRef(region, ref);
  const top = position.startsWith("top");

  useEffect(() => {
    const on = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  useEffect(() => {
    if (!hotkey) return;
    const on = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyT") {
        e.preventDefault();
        region.current?.querySelector<HTMLElement>("[data-slot=toast]:not([data-leaving])")?.focus();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [hotkey]);
  const live = toasts.filter((t) => !t.leaving).reverse(); // newest first
  useEffect(() => {
    if (!live.length) setExpanded(false);
  }, [live.length]);
  const onHeight = useCallback((id: string, h: number) => setHeights((m) => (m[id] === h ? m : { ...m, [id]: h })), []);

  const frontHeight = heights[live[0]?.id] ?? 0;
  const offsets: Record<string, number> = {};
  let sum = 0;
  for (const t of live) {
    offsets[t.id] = sum;
    sum += (heights[t.id] ?? 0) + GAP;
  }
  const listHeight = !live.length
    ? 0
    : expanded
      ? sum - GAP
      : frontHeight + (Math.min(live.length, visibleToasts) - 1) * PEEK;

  return (
    <section
      ref={regionRef}
      style={style}
      data-reduced={reduced ? "" : undefined}
      data-slot="toast-stack"
      data-position={position}
      data-expanded={expanded ? "" : undefined}
      aria-label={hotkey ? `${label} (Alt+T)` : label}
      tabIndex={-1}
      className={cn(styles.stack, contained ? styles.contained : styles.fixed, classNames?.root, className)}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setExpanded(true);
      }}
      onPointerLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setExpanded(false);
      }}
    >
      <ol data-slot="toast-list" className={cn(styles.list, classNames?.list)} style={{ height: listHeight }}>
        {[...toasts].reverse().map((t) => {
          const index = Math.max(0, live.indexOf(t));
          const sign = top ? 1 : -1;
          const y = expanded ? sign * offsets[t.id] : sign * index * PEEK;
          const scale = expanded ? 1 : 1 - index * 0.05;
          return (
            <ToastCard
              classNames={classNames}
              registerCard={registerCard}
              reduced={reduced}
              key={t.id}
              toast={t}
              index={index}
              top={top}
              y={y}
              scale={scale}
              height={!expanded && index > 0 ? frontHeight : undefined}
              behind={!expanded && index > 0}
              hidden={index >= visibleToasts && !expanded}
              paused={expanded || docHidden}
              onHeight={onHeight}
              onDismiss={dismiss}
            />
          );
        })}
      </ol>
    </section>
  );
}

const ICON: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="text-green" />,
  error: <XCircle className="text-red" />,
  warning: <AlertTriangle className="text-orange" />,
  info: <Info className="text-accent" />,
  loading: <Spinner size="sm" label="Working" />,
};

function ToastCard({
  classNames,
  registerCard,
  reduced,
  toast: t,
  index,
  top,
  y,
  scale,
  height,
  behind,
  hidden,
  paused,
  onHeight,
  onDismiss,
}: {
  classNames?: ToastStackClassNames;
  registerCard: ToastContext["registerCard"];
  reduced: boolean;
  toast: ToastRecord;
  index: number;
  top: boolean;
  y: number;
  scale: number;
  height?: number;
  behind: boolean;
  hidden: boolean;
  paused: boolean;
  onHeight: (id: string, h: number) => void;
  onDismiss: (id: string) => void;
}) {
  const cardRef = useCallback((node: HTMLLIElement | null) => registerCard(t.id, node), [t.id, registerCard]);
  const body = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef(0);
  const remaining = useRef<number | null>(null);
  const version = useRef(t.version);

  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => onHeight(t.id, el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [t.id, onHeight]);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // the timer runs only while the stack is collapsed and the page visible; an update restarts it
  useEffect(() => {
    if (version.current !== t.version) {
      version.current = t.version;
      remaining.current = null;
    }
    const total = t.duration ?? DURATION[t.type];
    if (!Number.isFinite(total) || t.leaving || paused) return;
    remaining.current ??= total;
    const began = Date.now();
    const timer = setTimeout(() => onDismiss(t.id), remaining.current);
    return () => {
      clearTimeout(timer);
      if (remaining.current !== null) remaining.current = Math.max(0, remaining.current - (Date.now() - began));
    };
  }, [paused, t.version, t.leaving, t.type, t.duration, t.id, onDismiss]);

  const onPointerDown = (e: ReactPointerEvent<HTMLLIElement>) => {
    if ((e.target as HTMLElement).closest("button, a") || e.button !== 0) return;
    start.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(0);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLLIElement>) => {
    if (drag !== null) setDrag(e.clientX - start.current);
  };
  const onPointerUp = () => {
    if (drag === null) return;
    if (Math.abs(drag) > 64) onDismiss(t.id);
    setDrag(null);
  };

  const offscreen = top ? -110 : 110;
  const transform =
    !entered && !reduced ? `translateY(${offscreen}%)` : `translate(${drag ?? 0}px, ${y}px) scale(${scale})`;
  return (
    <li
      ref={cardRef}
      data-slot="toast"
      data-type={t.type}
      tabIndex={0}
      role={t.type === "error" ? "alert" : "status"}
      aria-atomic
      data-behind={behind ? "" : undefined}
      data-hidden={hidden ? "" : undefined}
      data-leaving={t.leaving ? "" : undefined}
      data-dragging={drag ? "" : undefined}
      className={cn(styles.toast, classNames?.toast)}
      style={{
        transform,
        zIndex: 100 - index,
        height,
        opacity: drag ? Math.max(0.2, 1 - Math.abs(drag) / 160) : undefined,
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onDismiss(t.id);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <div data-slot="toast-card" className={cn(styles.card, classNames?.card)}>
        <div data-slot="toast-body" ref={body} className={cn(styles.body, classNames?.body)}>
          <span data-slot="toast-icon" className={cn(styles.icon, classNames?.icon)}>
            {ICON[t.type]}
          </span>
          <div data-slot="toast-content" className={cn("min-w-0", classNames?.content)}>
            <div data-slot="toast-title" className={cn(styles.title, classNames?.title)}>
              {t.title}
            </div>
            {t.description && (
              <div data-slot="toast-description" className={cn(styles.description, classNames?.description)}>
                {t.description}
              </div>
            )}
          </div>
          {t.action && (
            <Button
              size="sm"
              variant="secondary"
              className={cn("-my-0.5", classNames?.action)}
              onClick={() => {
                t.action?.onClick();
                onDismiss(t.id);
              }}
            >
              {t.action.label}
            </Button>
          )}
        </div>
      </div>
      <button
        data-slot="toast-close"
        type="button"
        aria-label="Dismiss"
        className={cn(styles.close, classNames?.close)}
        onClick={() => onDismiss(t.id)}
      >
        <X className="size-3" />
      </button>
    </li>
  );
}

export default ToastStack;
