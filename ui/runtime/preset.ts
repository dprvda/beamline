/** Pure visual contract. Importing this file never loads React, CSS, fonts or effects. */
export interface PresetRef {
  readonly id: string;
  readonly visualContract: 1;
  /**
   * A custom preset's built-in starting look. Its stylesheet supplies every token value; the base look's own structural
   * recipes (Glow's underlight, Ink's pen frames, Mono's dashed cells) still key on data-look, so UIRoot renders
   * data-look=<base> beside data-pui-preset=<id>. Built-in ids (beamline/<look>) need no base.
   */
  readonly base?: BuiltInLook;
}
export type BuiltInLook = "prism" | "soft" | "blueprint" | "glass" | "metal" | "glow" | "pop" | "mono" | "ink";
export type AppearanceTheme = "dark" | "light";
export type AppearanceDirection = "ltr" | "rtl";
export type AppearanceDensity = "compact" | "default" | "comfortable";
export type AppearanceMotion = "auto" | "reduced" | "none";
export type AppearanceAccent = "blue" | "violet" | "green" | "amber" | "orange" | "rose" | "neutral";
export type AppearanceTokens = Readonly<Partial<Record<`--pui-${string}`, string | number>>> & {
  /** Brand is dedicated so a local accent can replace an ancestor brand. */
  "--pui-brand"?: never;
};
/** Only presentation choices cross a scope. Components consume their allowed subset. */
export type DesignDefaultKey = "variant" | "size" | "density" | "tone" | "align" | "rounded";
export type DesignDefaultValue = string | number | boolean | null;
export type DesignDefaults = Readonly<Partial<Record<DesignDefaultKey, DesignDefaultValue>>>;
export type ComponentDefaults = Readonly<Record<string, DesignDefaults>>;
export interface AppearanceDescriptor {
  readonly preset: PresetRef;
  readonly theme: AppearanceTheme;
  readonly dir: AppearanceDirection;
  readonly density: AppearanceDensity;
  readonly motion: AppearanceMotion;
  readonly brand?: string;
  /** An accent preset. None: the look's own default brand (Prism's white light, Pop's tomato, else blue). */
  readonly accent?: AppearanceAccent;
  readonly tokens: AppearanceTokens;
  readonly defaults: ComponentDefaults;
  readonly appearanceClassName: string;
}
export const defaultAppearance: AppearanceDescriptor = Object.freeze({
  preset: Object.freeze({ id: "beamline/prism", visualContract: 1 }),
  theme: "dark",
  dir: "ltr",
  density: "default",
  motion: "auto",
  tokens: Object.freeze({}),
  defaults: Object.freeze({}),
  appearanceClassName: "",
});
