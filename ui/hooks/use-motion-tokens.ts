"use client";

import { useMemo, type RefObject } from "react";
import { useAppearanceRoot } from "@/runtime/appearance";
import { useResolvedAppearance } from "@/hooks/use-resolved-appearance";
import { motionAt, motionEase, motionTokens, type MotionTokens } from "@/lib/motion-tokens";
import { semanticMotion } from "@/lib/motion-source";

const durationToken = (name: string) =>
  name === "exit" ? "motion-out" : name === "in" || name === "out" ? `motion-${name}` : `duration-${name}`;
const easeToken = (name: string) => `ease-${name === "inOut" ? "in-out" : name}`;
const REQUEST = {
  times: [
    ...Object.keys(semanticMotion.duration).map(durationToken),
    ...Object.keys(semanticMotion.spring).map((name) => `spring-${name}`),
    ...Object.keys(semanticMotion.stagger).map((name) => `stagger-${name}`),
    "fade-in",
    "fade-out",
  ],
  easings: [...Object.keys(semanticMotion.ease).map(easeToken), "ease-spring", "ease-spring-bounce", "ease-overshoot"],
  numbers: ["motion-scale", "motion-look", "press-scale"],
  // timing only: the host's own type would make every control resolve differently from the page around it
  typography: false,
};

/**
 * Resolve each timing at the actual host; omitted host uses the nearest managed root. The first/server snapshot is
 * the pure foundation default. Local CSS values, scope changes, font readiness, OS preference and explicit refresh
 * update the same consumer; no document-wide first-root fallback or persistent global listener.
 */
export function useMotionTokens(hostRef?: RefObject<HTMLElement | null>): MotionTokens & {
  ready: boolean;
  /** Reduced or none: movement, springs and staggers are instant. */
  reduced: boolean;
  mode: "full" | "reduced" | "none";
  /** Opacity-only arrival and departure (seconds): kept under reduced, instant under none (APPEARANCE A06). */
  fade: { in: number; out: number };
} {
  const root = useAppearanceRoot();
  const scopeRef = useMemo(() => ({ current: root }), [root]);
  const resolved = useResolvedAppearance(hostRef ?? scopeRef, REQUEST);
  return useMemo(() => {
    if (!resolved.ready)
      return {
        ...motionTokens,
        ready: false,
        reduced: false,
        mode: "full" as const,
        fade: { in: motionTokens.duration.in, out: motionTokens.duration.out },
      };
    const reduced = resolved.reducedMotion;
    const speed = (resolved.numbers["motion-scale"] ?? 1) * (resolved.numbers["motion-look"] ?? 1);
    const fade =
      resolved.motionMode === "none"
        ? { in: 0.001, out: 0.001 }
        : {
            in: resolved.times["fade-in"] ?? semanticMotion.duration.in * speed,
            out: resolved.times["fade-out"] ?? semanticMotion.duration.out * speed,
          };
    const factor = reduced ? 0.001 / semanticMotion.duration.standard : speed;
    const base = motionAt(factor);
    const duration = Object.fromEntries(
      Object.entries(base.duration).map(([name, fallback]) => [
        name,
        reduced ? 0.001 : (resolved.times[durationToken(name)] ?? fallback),
      ]),
    ) as MotionTokens["duration"];
    const stagger = Object.fromEntries(
      Object.entries(base.stagger).map(([name, fallback]) => [
        name,
        reduced ? 0 : (resolved.times[`stagger-${name}`] ?? fallback),
      ]),
    ) as MotionTokens["stagger"];
    const ease = Object.fromEntries(
      Object.entries(base.ease).map(([name, fallback]) => [
        name,
        motionEase(resolved.easings[easeToken(name)], fallback),
      ]),
    ) as MotionTokens["ease"];
    const spring = { ...base.spring };
    for (const name of Object.keys(semanticMotion.spring) as (keyof typeof semanticMotion.spring)[])
      spring[name] = {
        ...base.spring[name],
        visualDuration: reduced ? 0.001 : (resolved.times[`spring-${name}`] ?? base.spring[name].visualDuration),
        bounce: reduced ? 0 : base.spring[name].bounce,
      };
    return {
      ...base,
      ready: true,
      reduced,
      mode: resolved.motionMode,
      fade,
      duration,
      stagger,
      ease,
      spring,
      pressScale: resolved.numbers["press-scale"] ?? base.pressScale,
      css: {
        spring: resolved.easings["ease-spring"] ?? base.css.spring,
        springBounce: resolved.easings["ease-spring-bounce"] ?? base.css.springBounce,
        overshoot: resolved.easings["ease-overshoot"] ?? base.css.overshoot,
      },
    };
  }, [resolved]);
}
