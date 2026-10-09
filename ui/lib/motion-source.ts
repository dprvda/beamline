/**
 * The one semantic motion source (APPEARANCE A06). styles/motion.css is generated from it (generate-motion.mjs) and
 * lib/motion-tokens.ts reads it, so CSS and JS share these numbers. Durations are seconds at the foundation default;
 * every scope multiplies them by the look's modifier (--pui-motion-look) and the customer's speed (--pui-motion-scale).
 */
export const semanticMotion = {
  duration: {
    in: 0.09,
    out: 0.18,
    instant: 0.09,
    fast: 0.12,
    exit: 0.18,
    standard: 0.2,
    considered: 0.36,
    spring: 0.32,
    /** A value-change flash fading out (order book, trades, price ticker): long enough to be seen, then gone. */
    flash: 0.6,
    /** Existing chart growth/glide, longer SVG sweeps, and insight-page changes. */
    chart: 0.5,
    sweep: 0.6,
    page: 0.24,
    /** Existing compact action-result icon feedback. */
    feedback: 0.16,
    /** Existing compact confirmation layout and theme icon morphs. */
    morph: 0.28,
  },
  ease: {
    default: [0.42, 0, 0.58, 1],
    enter: [0.16, 1, 0.3, 1],
    exit: [0.7, 0, 0.84, 0],
    standard: [0.22, 1, 0.36, 1],
    inOut: [0.65, 0, 0.35, 1],
    exception: [0.2, 0.8, 0.24, 1],
    chart: [0.2, 0, 0, 1],
  },
  stagger: { char: 0.012, word: 0.03, line: 0.06, item: 0.03 },
  /** Springs by how long they take to settle (visual duration, seconds) and their bounce (0 = critically damped). */
  spring: {
    snappy: { visualDuration: 0.2, bounce: 0 },
    smooth: { visualDuration: 0.3, bounce: 0 },
    morph: { visualDuration: 0.3, bounce: 0 },
    held: { visualDuration: 0.32, bounce: 0.14 },
  },
  /** The duration a resolved scope factor is measured against (--pui-duration-standard). */
  reference: "standard",
} as const;
