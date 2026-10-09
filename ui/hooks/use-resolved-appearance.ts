"use client";

import { useEffect, useLayoutEffect, useMemo, useReducer, useState, useSyncExternalStore, type RefObject } from "react";
import { flushSync } from "react-dom";
import { useAppearanceRoot, useScopeChanges } from "@/runtime/appearance";
import { APPEARANCE_EVENT } from "@/lib/motion-tokens";
import { resolveCssEasing, resolveCssTime } from "@/lib/css-values";

export interface AppearanceRequest {
  /** Token names with or without --pui-. Values are normalized to canvas-safe sRGB rgba(). */
  colors?: readonly string[];
  /** Length tokens, resolved to CSS pixels in this host's context. */
  metrics?: readonly string[];
  /** Unitless inputs such as chart-fill. */
  numbers?: readonly string[];
  /** CSS time tokens, including calc/max/var expressions, returned in seconds. */
  times?: readonly string[];
  /** CSS timing functions resolved in the host, ready for Web Animations. */
  easings?: readonly string[];
  /** The host's own type (family, size, line height, weight). Default true; false leaves `typography` empty, so hosts
   *  that differ only in their text (a button and the page around it) resolve to the same values. */
  typography?: boolean;
}
export interface ResolvedAppearance {
  ready: boolean;
  colors: Readonly<Record<string, string>>;
  metrics: Readonly<Record<string, number>>;
  numbers: Readonly<Record<string, number>>;
  times: Readonly<Record<string, number>>;
  easings: Readonly<Record<string, string>>;
  /** Reduced or none, from the scope's motion choice or (under auto) the OS preference. */
  reducedMotion: boolean;
  /** full, reduced (fades stay, movement goes) or none (no transitions); APPEARANCE A06. */
  motionMode: "full" | "reduced" | "none";
  typography: {
    fontFamily: string;
    bodyFontFamily: string;
    numericFontFamily: string;
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
  };
  /** Call after changing an external stylesheet. Raw CSS writes do not publish managed appearance changes. */
  refresh: () => void;
}
const EMPTY = Object.freeze({
  ready: false,
  colors: Object.freeze({}),
  metrics: Object.freeze({}),
  numbers: Object.freeze({}),
  times: Object.freeze({}),
  easings: Object.freeze({}),
  reducedMotion: false,
  motionMode: "full",
  typography: Object.freeze({
    fontFamily: "",
    bodyFontFamily: "",
    numericFontFamily: "",
    fontSize: 0,
    lineHeight: 0,
    fontWeight: "",
  }),
});
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const token = (name: string) => (name.startsWith("--") ? name : `--pui-${name}`);

// Resolved values keyed by the raw computed text of their custom property (var() already substituted), plus whatever
// else the result depends on. A hit needs no probe element, so mounting many controls costs no forced style recalcs.
const colorCache = new Map<string, string>();
const lengthCache = new Map<string, number>();
const numberCache = new Map<string, number>();
const fontCache = new Map<string, string>();
const remember = <T>(cache: Map<string, T>, key: string | null, compute: () => T): T => {
  if (key === null) return compute();
  const known = cache.get(key);
  if (known !== undefined) return known;
  const value = compute();
  cache.set(key, value);
  return value;
};

/** Resolve one color in the caller's real CSS context; never consult another root. */
export function resolveColor(css: string, host: HTMLElement): string {
  const doc = host.ownerDocument;
  const probe = doc.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;transition:none!important";
  probe.style.color = css;
  host.appendChild(probe);
  const computed = doc.defaultView!.getComputedStyle(probe).color;
  probe.remove();
  const canvas = doc.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return computed;
  context.fillStyle = computed;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(3)})`;
}

type Snapshot = Omit<ResolvedAppearance, "refresh">;

/** The reduced-motion query, one per window: `matches` is live, so it never needs asking again. */
const reducedQueries = new WeakMap<Window, MediaQueryList>();
const reducedQuery = (win: Window) => {
  let query = reducedQueries.get(win);
  if (!query) reducedQueries.set(win, (query = win.matchMedia("(prefers-reduced-motion: reduce)")));
  return query;
};

/** The host's values, read from its computed style; probes only for values no earlier read has resolved. */
function readAppearance(host: HTMLElement, request: AppearanceRequest): Snapshot {
  const win = host.ownerDocument.defaultView!;
  const computed = win.getComputedStyle(host);
  const raw = (name: string) => computed.getPropertyValue(token(name)).trim();
  const colors: Record<string, string> = {};
  for (const name of request.colors ?? []) {
    const value = raw(name);
    // currentColor depends on the host's own text colour, so it joins the key
    const key = /currentcolor/i.test(value) ? `${value}\u0000${computed.color}` : value;
    colors[name] = remember(colorCache, value ? key : null, () => resolveColor(`var(${token(name)})`, host));
  }
  const metrics: Record<string, number> = {};
  let probe: HTMLSpanElement | null = null;
  const measure = () => {
    if (!probe) {
      probe = host.ownerDocument.createElement("span");
      probe.style.cssText =
        "position:absolute;visibility:hidden;pointer-events:none;display:block;transition:none!important;padding:0;border:0";
      host.appendChild(probe);
    }
    return probe;
  };
  const rootSize = win.getComputedStyle(host.ownerDocument.documentElement).fontSize;
  for (const name of request.metrics ?? []) {
    const value = raw(name);
    if (!value) continue;
    // lengths relative to the host's box or the viewport are never cached; em/rem join the key with their sizes
    const key = /%|v[whib]|vmin|vmax|cq/.test(value) ? null : `${value}\u0000${computed.fontSize}\u0000${rootSize}`;
    const pixels = remember(lengthCache, key, () => {
      const el = measure();
      el.style.width = "";
      el.style.width = `var(${token(name)})`;
      return Number.parseFloat(getComputedStyle(el).width);
    });
    if (Number.isFinite(pixels)) metrics[name] = pixels;
  }
  const numbers: Record<string, number> = {};
  for (const name of request.numbers ?? []) {
    const value = raw(name);
    if (!value) continue;
    const number = remember(numberCache, value, () => {
      const el = measure();
      el.style.width = `calc(var(${token(name)}) * 1px)`;
      return Number.parseFloat(getComputedStyle(el).width);
    });
    if (Number.isFinite(number)) numbers[name] = number;
  }
  const times: Record<string, number> = {};
  for (const name of request.times ?? [])
    if (computed.getPropertyValue(token(name)).trim()) times[name] = resolveCssTime(host, token(name));
  const easings: Record<string, string> = {};
  for (const name of request.easings ?? [])
    if (computed.getPropertyValue(token(name)).trim()) easings[name] = resolveCssEasing(host, token(name));
  const typed = request.typography !== false;
  const font = (name: string) =>
    remember(fontCache, `${name}\u0000${raw(name)}\u0000${computed.fontFamily}`, () => {
      const el = measure();
      el.style.fontFamily = `var(--pui-${name})`;
      return getComputedStyle(el).fontFamily;
    });
  const bodyFontFamily = typed ? font("font-body") : "";
  const numericFontFamily = typed ? font("font-numeric") : "";
  (probe as HTMLSpanElement | null)?.remove();
  const fontSize = typed ? Number.parseFloat(computed.fontSize) || 0 : 0;
  const chosen = host.closest("[data-motion]")?.getAttribute("data-motion") ?? "auto";
  const motionMode: ResolvedAppearance["motionMode"] =
    chosen === "none" ? "none" : chosen === "reduced" || reducedQuery(win).matches ? "reduced" : "full";
  return {
    ready: true,
    colors,
    metrics,
    numbers,
    times,
    easings,
    reducedMotion: motionMode !== "full",
    motionMode,
    typography: typed
      ? {
          fontFamily: computed.fontFamily,
          bodyFontFamily,
          numericFontFamily,
          fontSize,
          lineHeight: Number.parseFloat(computed.lineHeight) || fontSize * 1.2,
          fontWeight: computed.fontWeight,
        }
      : EMPTY.typography,
  };
}

/**
 * One consumer's resolved values, held outside React so the first render can start from a good guess and a read that
 * finds the same values renders nothing. `want` asks for a read; reads of every consumer that asked during a commit
 * run together after it (one style pass serves them all instead of one per control), and the consumers whose values
 * changed render again at once, before paint.
 */
interface Store {
  snapshot: Snapshot;
  json: string;
  /** undefined until the first commit, so that one always reads */
  host: HTMLElement | null | undefined;
  request: AppearanceRequest;
  scope: object;
  live: boolean;
  /** Renders the consumer again (its reducer's dispatch), set once it has committed. */
  poke: (() => void) | null;
  get: () => Snapshot;
  want: () => void;
}

// The last values read for a request in a scope (keyed by the scope's descriptor): the next consumer of that request
// there starts from them. Most controls in a scope resolve to the same values, so their read confirms the guess and
// they render once; a host that differs (its own look, a reduced-motion region) renders again with its own.
const lastRead = new WeakMap<object, Map<string, Snapshot>>();
const queued = new Set<Store>();
/** Reads one consumer's host; true when its values changed (the consumer must render again). */
function resolve(store: Store): boolean {
  const host = store.host;
  // nothing to read yet (a host that attaches a commit later, inside a part that measures first) or no host at all:
  // keep what it has, the scope's values or the unresolved snapshot; turning a guess back to EMPTY rendered twice
  if (!host?.isConnected) return false;
  const next = readAppearance(host, store.request);
  const key = JSON.stringify(store.request);
  let scope = lastRead.get(store.scope);
  if (!scope) lastRead.set(store.scope, (scope = new Map()));
  scope.set(key, next);
  const json = JSON.stringify(next);
  // a ready snapshot only changes when the values do
  if (json === store.json) return false;
  store.snapshot = next;
  store.json = json;
  return true;
}
function flush() {
  const stores = [...queued];
  queued.clear();
  const changed = stores.filter((store) => store.live && resolve(store));
  // one synchronous render for all of them, before paint
  if (changed.length)
    flushSync(() => {
      for (const store of changed) store.poke?.();
    });
}
/** The values a new consumer starts from: the last read for its request in its scope, else (for a request without the
 *  host's type) a read at the scope's root, already on the page when a control mounts into it, so even the first
 *  controls of a page render once. */
function guessFor(request: AppearanceRequest, scope: object, root: HTMLElement | null): Snapshot | undefined {
  const key = JSON.stringify(request);
  let known = lastRead.get(scope);
  const guess = known?.get(key);
  // the root's own type is not a control's, so a request for the host's type only starts from another host's read
  if (guess || !root?.isConnected || request.typography !== false) return guess;
  const read = readAppearance(root, request);
  if (!known) lastRead.set(scope, (known = new Map()));
  known.set(key, read);
  return read;
}
function createStore(request: AppearanceRequest, scope: object, root: HTMLElement | null): Store {
  const guess = typeof window === "undefined" ? undefined : guessFor(request, scope, root);
  const store: Store = {
    snapshot: guess ?? EMPTY,
    json: guess ? JSON.stringify(guess) : "",
    host: undefined,
    request,
    scope,
    live: true,
    poke: null,
    get: () => store.snapshot,
    want: () => {
      if (!store.live) return;
      if (!queued.size) queueMicrotask(flush);
      queued.add(store);
    },
  };
  return store;
}
// changes reach the consumer through `poke`; the store hook is here for hydration, which renders the server snapshot
const unsubscribed = () => () => {};
const serverSnapshot = () => EMPTY as Snapshot;

/**
 * Stable unresolved server/first-client snapshot (hydration always starts from it), then host-local colors, type and
 * geometry. A client mount starts from the values last read for the same request in the same scope and keeps them
 * when its own host reads the same; reads run together after the commit, before paint.
 */
export function useResolvedAppearance(
  hostRef: RefObject<HTMLElement | null>,
  requestedTokens: AppearanceRequest | readonly string[] = {},
): ResolvedAppearance {
  // the scope's descriptor without rendering for it: a theme switch asks every consumer for a read, and only those
  // whose values changed (a chart's colours) render again
  const changes = useScopeChanges();
  const root = useAppearanceRoot();
  const key = JSON.stringify(requestedTokens);
  const request = useMemo((): AppearanceRequest => {
    const parsed = JSON.parse(key) as AppearanceRequest | string[];
    return Array.isArray(parsed) ? { colors: parsed } : parsed;
  }, [key]);
  const [store] = useState(() => createStore(request, changes.descriptor, root));
  const snapshot = useSyncExternalStore(unsubscribed, store.get, serverSnapshot);
  const [, poke] = useReducer((n: number) => n + 1, 0);
  // Layout attaches refs first. A host that attaches after the first render (an opened portal), a new request or a
  // scope descriptor update asks for a read; one that changed nothing asks for nothing.
  useIsoLayoutEffect(() => {
    store.live = true;
    store.poke = poke;
    const host = hostRef.current;
    if (host === store.host && request === store.request && changes.descriptor === store.scope) return;
    store.host = host;
    store.request = request;
    store.scope = changes.descriptor;
    // with nothing to start from, read now: the render that follows joins the commit's other updates (a control's
    // own ref and state settling) instead of adding a commit of its own; a guess is checked with the others later
    if (store.snapshot.ready) store.want();
    else if (resolve(store)) poke();
  });
  // An explicit refreshAppearance() (a raw scope token write, e.g. the studio), the OS motion preference and fonts
  // arriving re-resolve; style mutations are not observed.
  useEffect(() => {
    const doc = store.host?.ownerDocument ?? (typeof document === "undefined" ? undefined : document);
    if (!doc) return;
    const want = store.want;
    store.live = true;
    const unsubscribe = changes.subscribe(() => {
      store.scope = changes.descriptor;
      want();
    });
    doc.addEventListener(APPEARANCE_EVENT, want);
    const media = doc.defaultView ? reducedQuery(doc.defaultView) : undefined;
    media?.addEventListener("change", want);
    const fonts = doc.fonts;
    fonts?.addEventListener("loadingdone", want);
    // fonts still arriving can change font-relative lengths; once they are in, the mount read above already saw them
    if (fonts?.status === "loading") void fonts.ready.then(want);
    return () => {
      unsubscribe();
      store.live = false;
      queued.delete(store);
      doc.removeEventListener(APPEARANCE_EVENT, want);
      media?.removeEventListener("change", want);
      fonts?.removeEventListener("loadingdone", want);
      // a remount (StrictMode, a moved subtree) reads afresh
      store.host = undefined;
    };
  }, [store, changes]);
  return useMemo(() => ({ ...snapshot, refresh: store.want }), [snapshot, store]);
}
