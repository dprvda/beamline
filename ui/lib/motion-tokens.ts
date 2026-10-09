import { semanticMotion } from "./motion-source";

/** Semantic timings retuned from Arc (uiarc.dev, MIT). Pure defaults; rendered components use useMotionTokens(hostRef). */
export type MotionEase = readonly [number, number, number, number] | ((progress: number) => number);
type Spring = { readonly type: "spring"; readonly visualDuration: number; readonly bounce: number };
type PhysicsSpring = { readonly type: "spring"; readonly stiffness: number; readonly damping: number };

const REFERENCE_MS = semanticMotion.duration[semanticMotion.reference] * 1000;
/** The event a scope writer dispatches on its document after changing appearance (runtime refreshAppearance()). */
export const APPEARANCE_EVENT = "pui:appearance";

/** Resolves a scope's motion factor in its real CSS context: 1 at the foundation default, ~0.005 under reduced. */
export function readMotionFactor(host: Element | null | undefined): number {
  if (!host || typeof getComputedStyle === "undefined") return 1;
  const probe = host.ownerDocument.createElement("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;transition-property:opacity;transition-duration:var(--pui-duration-standard)";
  host.appendChild(probe);
  const raw = getComputedStyle(probe).transitionDuration.split(",")[0]?.trim() ?? "";
  probe.remove();
  const ms = raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
  return Number.isFinite(ms) && ms > 0 ? ms / REFERENCE_MS : 1;
}

/** @deprecated Pass an explicit host to readMotionFactor, or use useMotionTokens in React. */
export function currentMotionFactor(host?: Element | null): number {
  return readMotionFactor(host);
}

const seconds = <T extends Record<string, number>>(source: T, factor: () => number) => {
  const out = {} as { readonly [K in keyof T]: number };
  for (const key of Object.keys(source) as (keyof T)[])
    Object.defineProperty(out, key, { enumerable: true, get: () => source[key] * factor() });
  return out;
};
/** Adds one live getter per semantic spring to `target` (a spread would freeze the getters at creation time). */
const addSprings = <T extends object>(target: T, factor: () => number) => {
  for (const [name, spring] of Object.entries(semanticMotion.spring))
    Object.defineProperty(target, name, {
      enumerable: true,
      get: (): Spring => ({ type: "spring", visualDuration: spring.visualDuration * factor(), bounce: spring.bounce }),
    });
  return target;
};
/** Stiffness/damping springs scale as 1/f² and 1/f, so they settle f times slower or faster. */
const physics = (stiffness: number, damping: number, factor: () => number): PhysicsSpring => ({
  type: "spring",
  get stiffness() {
    const f = Math.max(factor(), 0.05);
    return stiffness / (f * f);
  },
  get damping() {
    return damping / Math.max(factor(), 0.05);
  },
});

/** Pure defaults multiplied by an explicit factor. No document lookup or listeners. */
export function motionAt(factor: number | (() => number)) {
  const f = typeof factor === "function" ? factor : () => factor;
  return {
    /** Seconds. `in` / `out` are the ruled pair (--pui-motion-in / --pui-motion-out). */
    duration: seconds(semanticMotion.duration, f),
    ease: semanticMotion.ease as Record<keyof typeof semanticMotion.ease, MotionEase>,
    /** CSS `linear()` curves (same strings as tokens.css). The last two overshoot and are NOT defaults (owner ruling). */
    css: {
      spring: "var(--pui-ease-spring)",
      springBounce: "var(--pui-ease-spring-bounce)",
      overshoot: "var(--pui-ease-overshoot)",
    },
    /** Press acknowledgement scale, applied at 0ms (--pui-press-scale). Not a duration: never scaled. */
    pressScale: 0.955,
    spring: addSprings({ responsive: physics(620, 50, f), gentle: physics(420, 42, f) }, f) as {
      readonly responsive: PhysicsSpring;
      readonly gentle: PhysicsSpring;
      /** Presses, toggles, thumbs, and small indicators. */
      readonly snappy: Spring;
      /** Panels, height changes, and layout shifts. Never overshoots. */
      readonly smooth: Spring;
      /** Shape morphs, shared layout highlights, and width changes that follow new content. */
      readonly morph: Spring;
      /** Sanctioned exception: an object the pointer is physically holding. */
      readonly held: Spring;
    },
    /** Stagger steps in seconds. Keep total stagger under roughly 0.3s. */
    stagger: seconds(semanticMotion.stagger, f),
    /** Blur radii in px for text and content crossfades. Keep blur small and brief. Not a duration. */
    blur: { subtle: 2, soft: 4, text: 8 },
    /** The factor these values were scaled by (1 = foundation default). */
    get factor() {
      return f();
    },
  };
}

export type MotionTokens = ReturnType<typeof motionAt>;
/** Server-safe foundation values. Prefer useMotionTokens(hostRef) for rendered components. */
export const motionTokens: MotionTokens = motionAt(1);

/**
 * A motion spring from how it should feel rather than raw physics: it settles in about `visualDuration` seconds, with
 * `bounce` 0 (critically damped) to 1. Takes either the numbers or a spring token (`physical(motionTokens.spring.snappy)`).
 * `restDelta` stops long, low-amplitude tails early for large values (pixels, chart domains).
 */
export function physical(
  visualDuration: number,
  bounce: number,
  restDelta?: number,
): { type: "spring"; stiffness: number; damping: number; mass: number; restDelta?: number; restSpeed?: number };
export function physical(
  spring: { visualDuration: number; bounce: number },
  restDelta?: number,
): { type: "spring"; stiffness: number; damping: number; mass: number; restDelta?: number; restSpeed?: number };
export function physical(a: number | { visualDuration: number; bounce: number }, b?: number, c?: number) {
  const [visualDuration, bounce, restDelta] = typeof a === "number" ? [a, b ?? 0, c] : [a.visualDuration, a.bounce, b];
  const root = (2 * Math.PI) / (Math.max(visualDuration, 0.001) * 1.2);
  return {
    type: "spring" as const,
    stiffness: root * root,
    damping: 2 * (1 - bounce) * root,
    mass: 1,
    ...(restDelta !== undefined ? { restDelta, restSpeed: restDelta * 2 } : {}),
  };
}

/** Translate a computed CSS timing function for Motion's JS animator without per-frame DOM reads. */
export function motionEase(value: string | undefined, fallback: MotionEase): MotionEase {
  if (!value) return fallback;
  const bezier = /^cubic-bezier\(([^)]+)\)$/.exec(value);
  if (bezier) {
    const points = bezier[1].split(",").map(Number);
    if (points.length === 4 && points.every(Number.isFinite)) return points as [number, number, number, number];
  }
  const named: Record<string, MotionEase> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],
    "step-start": () => 1,
    "step-end": (p) => (p < 1 ? 0 : 1),
  };
  if (named[value]) return named[value];
  const steps = /^steps\((\d+)(?:,\s*(jump-start|jump-end|jump-none|jump-both|start|end))?\)$/.exec(value);
  if (steps) {
    const n = Number(steps[1]),
      mode = steps[2] ?? "end";
    const start = mode === "start" || mode === "jump-start" || mode === "jump-both";
    const count = n + (mode === "jump-both" ? 1 : mode === "jump-none" ? -1 : 0);
    return (p) => Math.max(0, Math.min(1, (Math.floor(p * n) + Number(start)) / count));
  }
  const linear = /^linear\((.+)\)$/.exec(value);
  if (!linear) return fallback;
  const stops = linear[1].split(",").flatMap((text) => {
    const [y, ...positions] = text.trim().split(/\s+/);
    return (positions.length ? positions : [undefined]).map((x) => ({
      y: Number(y),
      x: x === undefined ? undefined : parseFloat(x) / 100,
    }));
  });
  if (stops.length < 2 || stops.some((s) => !Number.isFinite(s.y) || (s.x !== undefined && !Number.isFinite(s.x))))
    return fallback;
  stops[0].x ??= 0;
  stops[stops.length - 1].x ??= Math.max(1, ...stops.flatMap((s) => (s.x === undefined ? [] : [s.x])));
  let anchor = 0;
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].x === undefined) continue;
    stops[i].x = Math.max(stops[anchor].x!, stops[i].x!);
    for (let j = anchor + 1; j < i; j++)
      stops[j].x = stops[anchor].x! + ((stops[i].x! - stops[anchor].x!) * (j - anchor)) / (i - anchor);
    anchor = i;
  }
  return (p) => {
    let i = 0;
    while (i < stops.length - 2 && p >= stops[i + 1].x!) i++;
    const a = stops[i],
      b = stops[i + 1];
    return a.x === b.x ? b.y : a.y + ((b.y - a.y) * (p - a.x!)) / (b.x! - a.x!);
  };
}
