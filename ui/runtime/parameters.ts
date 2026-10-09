/**
 * Foundation parameters: the customer's one-place controls (APPEARANCE A07, O1 §14.1). Pure data and pure functions —
 * importing this file loads no React, CSS or DOM code, so the gallery studio, UIRoot, the CLI (tools/beamline.mjs) and
 * an agent read the same table.
 *
 * Precedence for every derived token: foundation default → the look's modifier (a % of the foundation value, or a
 * declared pin) → the customer's parameter (scales everything not pinned) → an explicit token override (beats pins).
 */
import type { AppearanceDensity, AppearanceMotion, BuiltInLook } from "./preset.ts";

export type NumericParameter = "motionScale" | "radiusScale" | "typeScale" | "typeRatio" | "spaceScale";
export interface NumericParameterSpec {
  readonly name: NumericParameter;
  /** The scope token UIRoot writes (on the root and its portal host). */
  readonly token: `--pui-${string}`;
  readonly label: string;
  readonly hint: string;
  readonly default: 1;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** How the studio shows the value. */
  readonly format: "percent" | "times";
  /** Foundation tokens derived from it (documentation and the proof script). */
  readonly derives: readonly string[];
}

export const NUMERIC_PARAMETERS: readonly NumericParameterSpec[] = [
  {
    name: "motionScale",
    token: "--pui-motion-scale",
    label: "Animation speed",
    hint: "Multiplies every duration and spring, in CSS and in JS. Reduced and none motion still win.",
    default: 1,
    min: 0.25,
    max: 4,
    step: 0.05,
    format: "times",
    derives: ["--pui-motion-in", "--pui-motion-out", "--pui-duration-*", "--pui-spring-*", "--pui-stagger-*"],
  },
  {
    name: "radiusScale",
    token: "--pui-radius-scale",
    label: "Roundness",
    hint: "Scales the style's corner radii. 0 is square; a style may pin its corners as part of its identity.",
    default: 1,
    min: 0,
    max: 2.5,
    step: 0.05,
    format: "percent",
    derives: [
      "--pui-radius-chip",
      "--pui-radius-control",
      "--pui-radius-card",
      "--pui-radius-panel",
      "--pui-radius-window",
      "--pui-radius-surface",
      "--pui-radius-pill",
      "--pui-bezel-radius",
    ],
  },
  {
    name: "typeScale",
    token: "--pui-type-scale",
    label: "Type size",
    hint: "Multiplies every step of the type scale and every role (.text-body, .text-caption …).",
    default: 1,
    min: 0.85,
    max: 1.25,
    step: 0.01,
    format: "percent",
    derives: ["--pui-text-2xs … --pui-text-5xl", "--pui-text-code"],
  },
  {
    name: "typeRatio",
    token: "--pui-type-ratio",
    label: "Type contrast",
    hint: "How far headings sit from body text. Below 100% the scale flattens; above, headings grow and captions shrink.",
    default: 1,
    min: 0.6,
    max: 1.4,
    step: 0.02,
    format: "percent",
    derives: ["--pui-text-2xs … --pui-text-5xl"],
  },
  {
    name: "spaceScale",
    token: "--pui-space-scale",
    label: "Spacing",
    hint: "Scales spacing tokens and Tailwind padding, margin and gap utilities. Control heights, icon sizes and row density stay.",
    default: 1,
    min: 0.75,
    max: 1.5,
    step: 0.05,
    format: "percent",
    derives: ["--pui-space-*", "--pui-pad-*", "--pui-gap-*", "--pui-gutter-page"],
  },
];

/** Every foundation parameter a scope can carry. Unset = inherit from the enclosing scope. */
export interface FoundationParameters {
  motionScale?: number;
  radiusScale?: number;
  typeScale?: number;
  typeRatio?: number;
  spaceScale?: number;
  motion?: AppearanceMotion;
  density?: AppearanceDensity;
  /** Any CSS colour; omitted = the theme's default brand (or the accent shorthand). */
  brand?: string;
  /** Focus ring line; never thinner than 2px. Explicit overrides of a style's own focus. */
  focusWidth?: string;
  focusStyle?: "solid" | "dashed" | "dotted" | "double";
}

export const FOCUS_STYLES = ["solid", "dashed", "dotted", "double"] as const;

export function numericSpec(name: NumericParameter): NumericParameterSpec {
  const spec = NUMERIC_PARAMETERS.find((p) => p.name === name);
  if (!spec) throw new Error(`Unknown foundation parameter ${name}`);
  return spec;
}

/** Validation messages name the parameter; an empty list means valid. */
export function validateParameters(params: FoundationParameters): string[] {
  const errors: string[] = [];
  for (const spec of NUMERIC_PARAMETERS) {
    const value = params[spec.name];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value))
      errors.push(`${spec.name}: expected a number, got ${String(value)}`);
    else if (value < spec.min || value > spec.max)
      errors.push(`${spec.name}: ${value} is outside ${spec.min}–${spec.max}`);
  }
  if (params.motion !== undefined && !["auto", "reduced", "none"].includes(params.motion))
    errors.push(`motion: expected auto, reduced or none`);
  if (params.density !== undefined && !["compact", "default", "comfortable"].includes(params.density))
    errors.push(`density: expected compact, default or comfortable`);
  if (params.focusWidth !== undefined) {
    const px = /^(\d+(?:\.\d+)?)px$/.exec(params.focusWidth);
    if (!px || Number(px[1]) < 2) errors.push(`focusWidth: a px length of at least 2px, got ${params.focusWidth}`);
  }
  if (params.focusStyle !== undefined && !FOCUS_STYLES.includes(params.focusStyle))
    errors.push(`focusStyle: expected ${FOCUS_STYLES.join(", ")}`);
  if (params.brand !== undefined && (!params.brand.trim() || /[;{}]/.test(params.brand)))
    errors.push(`brand: a CSS colour, got ${params.brand}`);
  return errors;
}

/** The scope tokens a parameter set writes. Density and motion are attributes (data-density, data-motion), not tokens. */
export function parameterTokens(params: FoundationParameters): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of NUMERIC_PARAMETERS) {
    const value = params[spec.name];
    if (value !== undefined && Number.isFinite(value)) out[spec.token] = String(value);
  }
  if (params.brand) out["--pui-brand"] = params.brand;
  if (params.focusWidth) out["--pui-focus-width"] = params.focusWidth;
  if (params.focusStyle) out["--pui-focus-style"] = params.focusStyle;
  return out;
}

/** True when nothing differs from the foundation defaults. */
export function isDefaultParameters(params: FoundationParameters): boolean {
  return (
    Object.values(params).every((value) => value === undefined) ||
    (NUMERIC_PARAMETERS.every((spec) => params[spec.name] === undefined || params[spec.name] === 1) &&
      params.motion === undefined &&
      params.density === undefined &&
      params.brand === undefined &&
      params.focusWidth === undefined &&
      params.focusStyle === undefined)
  );
}

/**
 * Identity values a built-in look pins: they ignore the customer's parameter (an explicit override of that exact
 * token still wins). Everything a look sets that is not pinned is a relative modifier: its approved value is the
 * foundation value × (look value ÷ foundation value), then × the customer's parameter.
 */
export const BUILT_IN_PINS: Readonly<Partial<Record<BuiltInLook, Readonly<Record<string, string>>>>> = {
  blueprint: {
    "--pui-radius-chip": "One 2px corner everywhere is Blueprint's drafting identity.",
    "--pui-radius-control": "One 2px corner everywhere is Blueprint's drafting identity.",
    "--pui-radius-card": "One 2px corner everywhere is Blueprint's drafting identity.",
    "--pui-radius-panel": "One 2px corner everywhere is Blueprint's drafting identity.",
    "--pui-radius-window": "One 2px corner everywhere is Blueprint's drafting identity.",
    "--pui-radius-surface": "One 2px corner everywhere is Blueprint's drafting identity.",
    "--pui-radius-pill": "One 2px corner everywhere is Blueprint's drafting identity.",
    "--pui-bezel-radius": "One 2px corner everywhere is Blueprint's drafting identity.",
  },
};

/** Look modifiers a style may carry as scope tokens (relative to the foundation). */
export const LOOK_MODIFIERS = {
  motion: { token: "--pui-motion-look", label: "Motion modifier", min: 0.5, max: 2 },
} as const;

/** Shape tokens a style sets as values that the customer's roundness then scales. */
export const RADIUS_TOKENS = [
  "--pui-radius-chip",
  "--pui-radius-control",
  "--pui-radius-card",
  "--pui-radius-panel",
  "--pui-radius-window",
  "--pui-radius-surface",
  "--pui-radius-pill",
  "--pui-bezel-radius",
] as const;
