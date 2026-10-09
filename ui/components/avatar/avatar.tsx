"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { AvatarDefaults } from "./defaults";
export type { AvatarDefaults } from "./defaults";

import { useState, type CSSProperties, type HTMLAttributes, type Ref } from "react";
import { cn } from "@/lib/utils";
import styles from "./avatar.module.css";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type PresenceStatus = "online" | "away" | "busy" | "offline";

const SIZE: Record<AvatarSize, string | undefined> = {
  xs: styles.xs,
  sm: styles.sm,
  md: undefined,
  lg: styles.lg,
  xl: styles.xl,
};
const PRESENCE: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  busy: "Do not disturb",
  offline: "Offline",
};

/** A person's (or account's) series hue, the same everywhere their name appears. */
export function hueOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `var(--pui-series-${(Math.abs(h) % 8) + 1})`;
}
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}|\d/u.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

/** A presence mark for avatars and lists. Colour and shape together: online a disc, away a crescent, busy a disc with
 *  a bar, offline a hollow ring, so the status survives greyscale and colour-blindness. */
export function PresenceDot({
  status,
  size = "md",
  className,
  style,
  ref,
}: {
  status: PresenceStatus;
  size?: AvatarSize;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLSpanElement>;
}) {
  return (
    <span
      style={style}
      ref={ref}
      role="img"
      aria-label={PRESENCE[status]}
      data-slot="presence-dot"
      data-status={status}
      data-size={size}
      className={cn(styles.presence, className)}
    />
  );
}

export interface AvatarClassNames {
  root?: string;
  face?: string;
  photo?: string;
  presence?: string;
}

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  /** A photo; initials show while it loads and if it fails. */
  src?: string;
  size?: AvatarSize;
  /** circle for people, square for companies and workspaces. */
  shape?: "circle" | "square";
  status?: PresenceStatus;
  ref?: Ref<HTMLSpanElement>;
  classNames?: AvatarClassNames;
}

/** A person or account in a small space: a photo, or initials on the colour their name always gets. */
export function Avatar({
  name,
  src,
  size: sizeProp,
  shape = "circle",
  status,
  className,
  classNames,
  style,
  ref,
  ...props
}: AvatarProps) {
  const scopeDefaults = useComponentDefaults<AvatarDefaults>("avatar", ["size"]);
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  const [failed, setFailed] = useState<string | null>(null);
  const photo = src && failed !== src;
  return (
    <span
      ref={ref}
      data-slot="avatar"
      data-shape={shape}
      data-status={status}
      role="img"
      aria-label={`${name}${status ? `, ${PRESENCE[status].toLowerCase()}` : ""}`}
      {...props}
      className={cn(styles.root, SIZE[size], classNames?.root, className)}
      style={{ "--pui-avatar-hue": hueOf(name), ...style } as CSSProperties}
    >
      <span aria-hidden data-slot="avatar-face" className={cn(styles.face, classNames?.face)}>
        {initialsOf(name)}
        {photo && (
          <img
            data-slot="avatar-photo"
            src={src}
            alt=""
            draggable={false}
            onError={() => setFailed(src)}
            className={cn(styles.photo, classNames?.photo)}
          />
        )}
      </span>
      {status && <PresenceDot status={status} size={size} className={cn(styles.mark, classNames?.presence)} />}
    </span>
  );
}

export default Avatar;
