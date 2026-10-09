"use client";

import type { CSSProperties, Ref } from "react";

import { useComponentDefaults } from "@/runtime/appearance";
import type { AlertDefaults } from "./defaults";
export type { AlertDefaults } from "./defaults";

import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/button/button";
import { cn } from "@/lib/utils";
import { focusAfterRemoval } from "@/lib/focus";
import styles from "./alert.module.css";

export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral";

export interface AlertClassNames {
  root?: string;
  wrap?: string;
  clip?: string;
  icon?: string;
  body?: string;
  title?: string;
  description?: string;
  action?: string;
  dismiss?: string;
}

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  /** What happened and what to do. */
  children?: ReactNode;
  /** Buttons or links: Retry, Update card. */
  action?: ReactNode;
  /** Replace the tone's icon, or false for none. */
  icon?: ReactNode | false;
  /** Shown or folded away (with onDismiss). Default true. */
  open?: boolean;
  /** Adds a close button; the alert folds away when open turns false. */
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
  classNames?: AlertClassNames;
  ref?: Ref<HTMLDivElement>;
}

const ICON: Record<AlertTone, ReactNode> = {
  info: <Info />,
  success: <CheckCircle2 />,
  warning: <AlertTriangle />,
  danger: <AlertCircle />,
  neutral: <Info />,
};

/** A message that stays until it is dealt with: what happened, what to do, and the action. Danger and warning are
 *  announced as they appear; a dismissed alert folds its height away. */
export function Alert({
  tone: toneProp,
  title,
  children,
  action,
  icon,
  open = true,
  onDismiss,
  className,
  style,
  classNames,
  ref,
}: AlertProps) {
  const scopeDefaults = useComponentDefaults<AlertDefaults>("alert", ["tone"]);
  const tone = toneProp ?? scopeDefaults.tone ?? "info";

  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) setShown(true);
  }, [open]);
  if (!shown) return null;
  return (
    <div
      data-slot="alert-wrap"
      data-state={open ? "open" : "closed"}
      className={cn(styles.wrap, classNames?.wrap)}
      onTransitionEnd={(e) => {
        if (!open && e.target === e.currentTarget) setShown(false);
      }}
    >
      <div className={cn(styles.clip, classNames?.clip)} data-slot="alert-clip">
        <div
          ref={ref}
          style={style}
          data-slot="alert"
          data-tone={tone}
          role={tone === "danger" || tone === "warning" ? "alert" : "status"}
          className={cn(styles.alert, "text-sm leading-relaxed", classNames?.root, className)}
        >
          {icon !== false && (
            <span aria-hidden data-slot="alert-icon" className={cn(styles.icon, classNames?.icon)}>
              {icon ?? ICON[tone]}
            </span>
          )}
          <div data-slot="alert-body" className={cn("grid min-w-0 flex-1 gap-0.5", classNames?.body)}>
            {title && (
              <p data-slot="alert-title" className={cn("font-medium text-ink", classNames?.title)}>
                {title}
              </p>
            )}
            {children && (
              <div data-slot="alert-description" className={classNames?.description}>
                {children}
              </div>
            )}
            {action && (
              <div data-slot="alert-action" className={cn("mt-2 flex flex-wrap gap-2", classNames?.action)}>
                {action}
              </div>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Dismiss"
              data-slot="alert-dismiss"
              className={cn("-me-1.5 -mt-1 shrink-0 text-ink-3", classNames?.dismiss)}
              onClick={(e) => {
                focusAfterRemoval(e.currentTarget.closest("[data-slot=alert-wrap]"));
                onDismiss();
              }}
            >
              <X />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Alert;
