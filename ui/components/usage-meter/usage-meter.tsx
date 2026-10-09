"use client";

import type { CSSProperties, Ref } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeltaGhost, useDeltaGhost } from "../_shared/delta-ghost";
import styles from "./usage-meter.module.css";

export interface UsageMeterSegment {
  id: string;
  label: string;
  value: number;
}

export interface UsageMeterClassNames {
  root?: string;
  header?: string;
  label?: string;
  value?: string;
  bar?: string;
  track?: string;
  segment?: string;
  overflow?: string;
  over?: string;
  legend?: string;
  legendItem?: string;
  swatch?: string;
  amount?: string;
  remainder?: string;
}

export interface UsageMeterProps {
  /** What is metered: "Storage", "Seats". */
  label: string;
  /** What fills the allowance, in order. */
  segments: UsageMeterSegment[];
  limit: number;
  /** After each number: "GB", "k". */
  unit?: string;
  decimals?: number;
  /** Words for what is left. Default "left". */
  freeLabel?: string;
  /** Words for going past the limit. Default "over". */
  overLabel?: string;
  /** Share of the limit (0–1) where it turns to a warning. Default 0.9. */
  warnAt?: number;
  className?: string;
  style?: CSSProperties;
  classNames?: UsageMeterClassNames;
  ref?: Ref<HTMLDivElement>;
}

/** An allowance and what fills it: one bar split by source, the remaining room, a warning near the limit and the
 *  overflow in its own red well past a notch at the limit; a change to the total leaves its ghost for a moment. Colour is never the only signal: every number is written in the legend. */
export function UsageMeter({
  label,
  segments,
  limit,
  unit = "",
  decimals = 0,
  freeLabel = "left",
  overLabel = "over",
  warnAt = 0.9,
  className,
  style,
  classNames,
  ref,
}: UsageMeterProps) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const over = total > limit;
  const fmt = (n: number) =>
    `${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit ? (unit.length > 2 ? ` ${unit}` : unit) : ""}`;
  const state = over ? "over" : total >= limit * warnAt ? "warn" : "ok";
  // the allowance well shows each source up to the limit; whatever lies past it goes to the overflow well
  let room = limit;
  const shown = segments.map((s) => {
    const v = Math.max(0, Math.min(s.value, room));
    room -= v;
    return v;
  });
  // the total's last change stays a moment as a ghost (_shared/delta-ghost): freed room drains, new use arrives lit
  const [ghost, clearGhost] = useDeltaGhost(Math.min(total, limit) / limit);
  const swatch = (i: number) => ({ background: `var(--pui-series-${(i % 8) + 1})` }) as CSSProperties;
  return (
    <div
      ref={ref}
      style={style}
      data-slot="usage-meter"
      data-state={state}
      className={cn("grid gap-2", classNames?.root, className)}
    >
      <div
        data-slot="usage-meter-header"
        className={cn("flex items-baseline justify-between gap-3 text-sm", classNames?.header)}
      >
        <span data-slot="usage-meter-label" className={cn("font-medium text-ink", classNames?.label)}>
          {label}
        </span>
        <span
          data-slot="usage-meter-value"
          className={cn(
            "inline-flex items-center gap-1 font-numeric tabular-nums",
            classNames?.value,
            state === "over" ? "text-red" : state === "warn" ? "text-orange" : "text-ink-2",
          )}
        >
          {state === "over" && <AlertCircle aria-hidden className="size-3.5 self-center" />}
          {state === "warn" && <AlertTriangle aria-hidden className="size-3.5 self-center" />}
          <span className="[unicode-bidi:isolate]">
            {fmt(total)} <span className="text-ink-3">of {fmt(limit)}</span>
          </span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={total}
        aria-valuetext={`${fmt(total)} of ${fmt(limit)}${over ? `, ${fmt(total - limit)} ${overLabel}` : `, ${fmt(limit - total)} ${freeLabel}`}`}
        data-slot="usage-meter-bar"
        className={cn(styles.bar, classNames?.bar)}
      >
        <span
          className={cn(styles.track, classNames?.track)}
          data-slot="usage-meter-track"
          style={{ flex: `${limit} 1 0px` }}
        >
          <DeltaGhost ghost={ghost} onDone={clearGhost} />
          {segments.map((s, i) => (
            <span
              key={s.id}
              data-slot="usage-meter-segment"
              className={cn(styles.segment, classNames?.segment)}
              style={{ ...swatch(i), width: `${(shown[i] / limit) * 100}%` }}
            />
          ))}
        </span>
        {over && (
          <span
            data-slot="usage-meter-overflow"
            className={cn(styles.track, classNames?.overflow)}
            style={{ flex: `${total - limit} 1 0px` }}
          >
            <span data-slot="usage-meter-over" className={cn(styles.over, classNames?.over)} />
          </span>
        )}
      </div>
      <ul
        data-slot="usage-meter-legend"
        className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2", classNames?.legend)}
      >
        {segments.map((s, i) => (
          <li
            key={s.id}
            data-slot="usage-meter-legend-item"
            className={cn("flex items-center gap-1.5", classNames?.legendItem)}
          >
            <span
              aria-hidden
              className={cn(styles.swatch, classNames?.swatch)}
              data-slot="usage-meter-swatch"
              style={swatch(i)}
            />
            {s.label}
            <span
              data-slot="usage-meter-amount"
              className={cn("font-numeric text-ink-3 tabular-nums", classNames?.amount)}
            >
              {fmt(s.value)}
            </span>
          </li>
        ))}
        <li
          data-slot="usage-meter-remainder"
          className={cn(
            "flex items-center gap-1.5",
            over ? "font-medium text-red" : "text-ink-3",
            classNames?.remainder,
          )}
        >
          {over ? (
            <>
              <AlertCircle aria-hidden className="size-3" />
              {fmt(total - limit)} {overLabel}
            </>
          ) : (
            <>
              <span aria-hidden className={styles.swatchFree} />
              {fmt(limit - total)} {freeLabel}
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

export default UsageMeter;
