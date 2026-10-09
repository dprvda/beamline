import type { ButtonSize, ButtonTone, ButtonVariant } from "./button-variants";
/** Scoped design choices only; no loading, events or domain state. */
export interface ButtonDefaults {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
}
