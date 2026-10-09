"use client";

import {
  createContext,
  useContext,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import * as Direction from "@radix-ui/react-direction";
import { APPEARANCE_EVENT } from "../lib/motion-tokens";
import type { BuiltInLook } from "./preset";
import { NUMERIC_PARAMETERS, type NumericParameter } from "./parameters";
import {
  defaultAppearance,
  type AppearanceAccent,
  type AppearanceDescriptor,
  type AppearanceTheme,
  type ComponentDefaults,
  type DesignDefaultKey,
  type DesignDefaults,
} from "./preset";

export type UIRootTheme = AppearanceTheme;
export type UIRootAccent = AppearanceAccent;
export interface UIRootProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "dir" | "children">, Partial<Omit<AppearanceDescriptor, "defaults">> {
  /** @deprecated Import selected preset CSS and pass its pure reference through preset. */
  look?: BuiltInLook;
  /** False resets managed ancestor choices before applying local inputs. */
  inherit?: boolean;
  defaults?: ComponentDefaults;
  /** Animation speed: multiplies every duration and spring (CSS and JS). 1 = foundation default. */
  motionScale?: number;
  /** Roundness: scales the style's radii (pinned identity radii excepted). 0 = square. */
  radiusScale?: number;
  /** Type size: multiplies every step of the type scale. */
  typeScale?: number;
  /** Type contrast: exponent on each step's distance from body size; <1 flatter, >1 more dramatic. */
  typeRatio?: number;
  /** Spacing: scales the 4px spacing tokens and named paddings/gaps (not control heights or row density). */
  spaceScale?: number;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}
interface Scope {
  descriptor: AppearanceDescriptor;
  root: HTMLDivElement | null;
  portal: HTMLElement | null;
}
const AppearanceContext = createContext<Scope | undefined>(undefined);
/*
 * Narrow channels of the same scope, so a part re-renders only for what it reads: a theme switch changes the
 * descriptor, and every part reading the whole of it (a Button for its defaults, every animated part for the motion
 * choice, a grid for its density) rendered again for a change the stylesheet had already made (bench/FINDINGS.md #2).
 * Reading a context costs no hook, so these are free at mount.
 */
const DefaultsContext = createContext<ComponentDefaults>(defaultAppearance.defaults);
const MotionContext = createContext<AppearanceDescriptor["motion"]>(defaultAppearance.motion);
const DensityContext = createContext<AppearanceDescriptor["density"]>(defaultAppearance.density);
const ElementsContext = createContext<{ root: HTMLDivElement | null; portal: HTMLElement | null } | undefined>(
  undefined,
);
/** The scope's descriptor without re-rendering: the current one, and a call when it changes (after the scope commits
 *  it, before paint), for parts that re-read the page rather than render from the descriptor. */
export interface ScopeChanges {
  readonly descriptor: AppearanceDescriptor;
  subscribe: (listener: () => void) => () => void;
}
const NO_SCOPE: ScopeChanges = { descriptor: defaultAppearance, subscribe: () => () => {} };
const ChangesContext = createContext<ScopeChanges>(NO_SCOPE);
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const warnedLooks = new Set<string>();
const DESIGN_KEYS = new Set<DesignDefaultKey>(["variant", "size", "density", "tone", "align", "rounded"]);
function mergeDefaults(parent: ComponentDefaults, local: ComponentDefaults | undefined): ComponentDefaults {
  const out: Record<string, DesignDefaults> = { ...parent };
  for (const [component, supplied] of Object.entries(local ?? {})) {
    const values = { ...out[component] };
    for (const [key, value] of Object.entries(supplied)) {
      if (
        DESIGN_KEYS.has(key as DesignDefaultKey) &&
        value !== undefined &&
        (value === null || ["string", "number", "boolean"].includes(typeof value))
      )
        values[key as DesignDefaultKey] = value;
    }
    out[component] = values;
  }
  return out;
}
/** Nearest managed descriptor; static roots provide DOM styling only. */
export function useAppearance(): AppearanceDescriptor {
  return useContext(AppearanceContext)?.descriptor ?? defaultAppearance;
}
/** undefined = no provider; null = managed provider whose portal is not attached yet. */
export function usePortalContainer(): HTMLElement | null | undefined {
  return useContext(ElementsContext)?.portal;
}
/** Compatibility bridge. New renderers supply their own host ref. */
export function useAppearanceRoot(): HTMLElement | null {
  return useContext(ElementsContext)?.root ?? null;
}
/** The scope's motion choice (auto, reduced, none); re-renders only when it changes. */
export function useScopeMotion(): AppearanceDescriptor["motion"] {
  return useContext(MotionContext);
}
/** The scope's row density; re-renders only when it changes. */
export function useScopeDensity(): AppearanceDescriptor["density"] {
  return useContext(DensityContext);
}
/** The scope's descriptor as it changes, without rendering for it (see ScopeChanges). */
export function useScopeChanges(): ScopeChanges {
  return useContext(ChangesContext);
}
/** Only the component's allowed design props, with no implementation imports. */
export function useComponentDefaults<T extends object>(
  component: string,
  allowed: readonly (keyof T & DesignDefaultKey)[],
): Partial<T> {
  const defaults = useContext(DefaultsContext)[component];
  const result: Record<string, unknown> = {};
  for (const key of allowed) if (defaults?.[key] !== undefined) result[key] = defaults[key];
  return result as Partial<T>;
}
/** Tell renderers and JS motion in this document that scope appearance changed outside React (a raw token write). */
export function refreshAppearance(doc: Document | undefined = typeof document === "undefined" ? undefined : document) {
  doc?.dispatchEvent(new Event(APPEARANCE_EVENT));
}
const THEMES = new Set(["dark", "light"]);
const ACCENTS = new Set(["blue", "violet", "green", "amber", "orange", "rose", "neutral"]);
/**
 * A UIRoot with no managed ancestor inside a static scope (<html class="pui" data-look=…>) starts from that scope's
 * attributes, so a region inherits the page's look, theme, accent, density and motion unless it sets its own (A02).
 */
function readStaticScope(node: HTMLElement | null): Partial<AppearanceDescriptor> | null {
  const scope = node?.parentElement?.closest<HTMLElement>(".pui");
  if (!scope) return null;
  const out: { -readonly [K in keyof AppearanceDescriptor]?: AppearanceDescriptor[K] } = {};
  const preset = scope.getAttribute("data-pui-preset");
  const look = scope.getAttribute("data-look");
  if (preset) out.preset = { id: preset, visualContract: 1, ...(look ? { base: look as BuiltInLook } : {}) };
  else if (look) out.preset = { id: `beamline/${look}`, visualContract: 1 };
  const theme = scope.getAttribute("data-theme") ?? (scope.classList.contains("light") ? "light" : null);
  if (theme && THEMES.has(theme)) out.theme = theme as AppearanceDescriptor["theme"];
  const dir = node?.parentElement?.closest("[dir]")?.getAttribute("dir");
  if (dir === "rtl" || dir === "ltr") out.dir = dir;
  const density = scope.getAttribute("data-density");
  if (density === "compact" || density === "comfortable" || density === "default") out.density = density;
  const motion = scope.getAttribute("data-motion");
  if (motion === "auto" || motion === "reduced" || motion === "none") out.motion = motion;
  const accent = scope.getAttribute("data-accent");
  if (accent && ACCENTS.has(accent)) out.accent = accent as AppearanceDescriptor["accent"];
  const brand = scope.style.getPropertyValue("--pui-brand").trim();
  if (brand) out.brand = brand;
  // Parameters written on the static scope reach this scope's portal host too, which does not sit inside it.
  const computed = getComputedStyle(scope);
  const tokens: Record<string, string> = {};
  for (const spec of NUMERIC_PARAMETERS) {
    const value = computed.getPropertyValue(spec.token).trim();
    if (value) tokens[spec.token] = value;
  }
  if (Object.keys(tokens).length) out.tokens = tokens as AppearanceDescriptor["tokens"];
  return out;
}
/** One context and stable portal host per scope; appearance updates them in place. */
export function UIRoot({
  preset,
  look,
  theme,
  dir,
  density,
  motion,
  brand,
  accent,
  tokens,
  defaults,
  appearanceClassName,
  inherit = true,
  motionScale,
  radiusScale,
  typeScale,
  typeRatio,
  spaceScale,
  className,
  style,
  children,
  ref,
  ...props
}: UIRootProps) {
  const managedParent = useContext(AppearanceContext)?.descriptor;
  const [staticScope, setStaticScope] = useState<Partial<AppearanceDescriptor> | null>(null);
  const parent = useMemo(
    () => managedParent ?? (staticScope ? { ...defaultAppearance, ...staticScope } : defaultAppearance),
    [managedParent, staticScope],
  );
  const base = inherit ? parent : defaultAppearance;
  const parameters: Partial<Record<NumericParameter, number | undefined>> = {
    motionScale,
    radiusScale,
    typeScale,
    typeRatio,
    spaceScale,
  };
  const parameterKey = JSON.stringify(parameters);
  // callers often pass a fresh tokens or preset object with the same contents on every render; the descriptor (and so
  // every control reading the scope) changes only when the contents do
  const tokensKey = JSON.stringify(tokens ?? null);
  const presetKey = JSON.stringify(preset ?? null);
  // the defaults keep their identity across a theme or look change, so parts reading only them do not render for it
  const defaultsKey = JSON.stringify(defaults ?? null);
  const mergedDefaults = useMemo(
    () => mergeDefaults(base.defaults, defaults),
    // read through their content key
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base.defaults, defaultsKey],
  );
  const descriptor = useMemo<AppearanceDescriptor>(() => {
    const nextPreset =
      preset ?? (look === undefined ? base.preset : { id: `beamline/${look}`, visualContract: 1 as const });
    if (nextPreset.visualContract !== 1 || !nextPreset.id)
      throw new Error("UIRoot requires visual contract 1 and a preset id.");
    const nextTokens: Record<string, string | number> = { ...base.tokens } as Record<string, string | number>;
    for (const [key, value] of Object.entries(tokens ?? {})) {
      if (key === "--pui-brand") throw new Error("Use UIRoot brand instead of tokens['--pui-brand'].");
      if (key.startsWith("--pui-") && value !== undefined) nextTokens[key] = value;
    }
    const supplied = JSON.parse(parameterKey) as typeof parameters;
    for (const spec of NUMERIC_PARAMETERS) {
      const value = supplied[spec.name];
      if (value === undefined) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
        throw new Error(`UIRoot ${spec.name} must be a finite number ≥ 0.`);
      nextTokens[spec.token] = value;
    }
    return {
      preset: nextPreset,
      theme: theme ?? base.theme,
      dir: dir ?? base.dir,
      density: density ?? base.density,
      motion: motion ?? base.motion,
      brand: brand !== undefined ? brand : accent !== undefined ? undefined : base.brand,
      accent: accent ?? base.accent,
      tokens: nextTokens,
      defaults: mergedDefaults,
      appearanceClassName: appearanceClassName ?? base.appearanceClassName,
    };
    // preset and tokens are read through their content keys
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    base,
    presetKey,
    look,
    theme,
    dir,
    density,
    motion,
    brand,
    accent,
    tokensKey,
    mergedDefaults,
    appearanceClassName,
    parameterKey,
  ]);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const portalKeys = useRef<string[]>([]);
  // An inherited explicit brand reaches this scope through CSS; a local accent (or inherit=false) must clear it.
  const clearsBrand = accent !== undefined || !inherit || !!managedParent;
  const managedStyle = {
    ...descriptor.tokens,
    ...(descriptor.brand !== undefined
      ? { "--pui-brand": descriptor.brand }
      : clearsBrand
        ? { "--pui-brand": "initial" }
        : {}),
  } as CSSProperties;
  const appearanceClasses = ["pui", descriptor.theme, descriptor.appearanceClassName].filter(Boolean).join(" ");
  const attributes = {
    "data-pui-preset": descriptor.preset.id,
    "data-visual-contract": descriptor.preset.visualContract,
    "data-theme": descriptor.theme,
    "data-accent": descriptor.accent,
    "data-density": descriptor.density,
    "data-motion": descriptor.motion,
    "data-look": descriptor.preset.id.startsWith("beamline/") ? descriptor.preset.id.slice(9) : descriptor.preset.base,
    dir: descriptor.dir,
  };
  const mirror = (target: HTMLElement) => {
    target.className = appearanceClasses;
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined) target.removeAttribute(name);
      else target.setAttribute(name, String(value));
    }
    for (const key of portalKeys.current) target.style.removeProperty(key);
    for (const [key, value] of Object.entries(managedStyle)) target.style.setProperty(key, String(value));
    portalKeys.current = Object.keys(managedStyle);
  };
  useIsoLayoutEffect(() => {
    const host = document.createElement("div");
    host.dataset.slot = "ui-root-layer";
    mirror(host);
    document.body.appendChild(host);
    setPortal(host);
    return () => host.remove();
    // The host belongs to the scope lifetime. The insertion effect mirrors later appearance updates.
  }, []);
  useInsertionEffect(() => {
    if (portal) mirror(portal);
  });
  // Outside a managed ancestor, start from the enclosing static scope, and follow it when its writer publishes a change
  // (refreshAppearance); a re-read that finds nothing new changes no state, so the scope's own publish settles.
  useIsoLayoutEffect(() => {
    if (managedParent || !root) return;
    const read = () => {
      const next = readStaticScope(root);
      setStaticScope((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    read();
    root.ownerDocument.addEventListener(APPEARANCE_EVENT, read);
    return () => root.ownerDocument.removeEventListener(APPEARANCE_EVENT, read);
  }, [managedParent, root]);
  // JS motion and canvas renderers re-resolve after this scope's appearance changes. Mounting is not a change: the
  // scope's attributes are already rendered when its children first read them, and every control on the page would
  // otherwise re-read its tokens once per scope that mounts (one per gallery example).
  const published = useRef<{ descriptor: typeof descriptor; root: HTMLElement } | null>(null);
  useEffect(() => {
    if (!root) return;
    const previous = published.current;
    published.current = { descriptor, root };
    if (previous && (previous.descriptor !== descriptor || previous.root !== root))
      refreshAppearance(root.ownerDocument);
  }, [descriptor, root]);
  // A look whose stylesheet is not loaded paints nothing: switches, tracks and field frames turn invisible with no error
  // (the installer adds only the looks asked for, and a UIRoot without a preset shows Prism, the default). Say so, once
  // per look.
  useEffect(() => {
    const look = attributes["data-look"];
    if (!root || !look || warnedLooks.has(look) || /jsdom/i.test(navigator.userAgent)) return;
    if (getComputedStyle(root).getPropertyValue("--m-control-bg").trim()) return;
    warnedLooks.add(look);
    console.warn(
      `Beamline: the look "${look}" is not loaded, so controls render without paint. Pass the look you installed to ` +
        `UIRoot (preset={glass} with import { glass } from "@beamline/look-glass"), or install "${look}" too.`,
    );
    // checked when the look changes; the attributes object is rebuilt every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, descriptor.preset.id]);
  const scope = useMemo(() => ({ descriptor, root, portal }), [descriptor, root, portal]);
  const elements = useMemo(() => ({ root, portal }), [root, portal]);
  const [changes] = useState(() => {
    const listeners = new Set<() => void>();
    return {
      descriptor,
      listeners,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  });
  // after this scope commits a new descriptor (its attributes are on the page), before paint
  useIsoLayoutEffect(() => {
    if (changes.descriptor === descriptor) return;
    changes.descriptor = descriptor;
    for (const listener of changes.listeners) listener();
  }, [changes, descriptor]);
  const attach = useMemo(
    () => (node: HTMLDivElement | null) => {
      setRoot(node);
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    },
    [ref],
  );
  return (
    <AppearanceContext.Provider value={scope}>
      <ChangesContext.Provider value={changes}>
        <ElementsContext.Provider value={elements}>
          <DefaultsContext.Provider value={descriptor.defaults}>
            <MotionContext.Provider value={descriptor.motion}>
              <DensityContext.Provider value={descriptor.density}>
                <Direction.DirectionProvider dir={descriptor.dir}>
                  <div
                    {...props}
                    {...attributes}
                    ref={attach}
                    data-slot="ui-root"
                    className={[appearanceClasses, className].filter(Boolean).join(" ")}
                    style={{ ...managedStyle, ...style }}
                  >
                    {children}
                  </div>
                </Direction.DirectionProvider>
              </DensityContext.Provider>
            </MotionContext.Provider>
          </DefaultsContext.Provider>
        </ElementsContext.Provider>
      </ChangesContext.Provider>
    </AppearanceContext.Provider>
  );
}
export default UIRoot;
