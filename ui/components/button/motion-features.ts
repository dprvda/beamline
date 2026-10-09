// REASON: Motion's DOM animation features (tween, spring, presence, press) are loaded after the first paint, so a
// Button costs a small part of Motion on first load; LazyMotion in button.tsx renders until they arrive.
import { domAnimation } from "motion/react";

export default domAnimation;
