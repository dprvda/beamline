"use client";

import { useComponentDefaults } from "@/runtime/appearance";
import type { TagInputDefaults } from "./defaults";
export type { TagInputDefaults } from "./defaults";

import {
  useRef,
  useState,
  type CSSProperties,
  type Ref,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Field,
  FieldFrame,
  fieldControlClass,
  useFieldIds,
  type FieldSize,
  type FieldClassNames,
} from "@/components/_shared/field";
import { FieldChip } from "@/components/_shared/chip";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useFlip } from "@/hooks/use-flip";
import { cn } from "@/lib/utils";

export type TagInputClassNames = Pick<FieldClassNames, "root" | "label" | "frame" | "description" | "error"> &
  Partial<Record<"input" | "chip" | "chipText" | "remove" | "status", string>>;

export interface TagInputProps {
  label: ReactNode;
  hideLabel?: boolean;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  description?: ReactNode;
  error?: ReactNode;
  /** Most tags allowed. */
  max?: number;
  /** Say what is wrong with a value ("Not an email address"), or nothing to accept it. */
  validate?: (value: string) => string | undefined;
  size?: FieldSize;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  classNames?: TagInputClassNames;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Short free-form values as tags: Enter, comma or Tab adds one, pasting a list adds them all, Backspace on an empty
 * field marks the last tag and a second Backspace removes it. Duplicates are skipped and said so.
 */
export function TagInput({
  label,
  hideLabel,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  placeholder,
  description,
  error,
  max,
  validate,
  size: sizeProp,
  disabled,
  id,
  className,
  style,
  classNames,
  ref,
}: TagInputProps) {
  const scopeDefaults = useComponentDefaults<TagInputDefaults>("tag-input", ["size"]);
  const size = sizeProp ?? scopeDefaults.size ?? "md";

  const [own, setOwn] = useState(defaultValue);
  const tags = valueProp ?? own;
  const set = (next: string[]) => {
    if (!valueProp) setOwn(next);
    onValueChange?.(next);
  };
  const [draft, setDraft] = useState("");
  const [marked, setMarked] = useState(false);
  const [note, setNote] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const controlRef = useComposedRef(input, ref);
  // chips share the frame with the typing area: they grow in, close up and leave a ghost
  useFlip(() => input.current?.parentElement ?? null);
  const shown = error ?? note;
  const { controlId, descriptionId, errorId, aria } = useFieldIds(id, { description, error: shown });
  const full = max !== undefined && tags.length >= max;

  const add = (raw: string[]) => {
    const next = [...tags];
    for (const r of raw.map((s) => s.trim()).filter(Boolean)) {
      if (max !== undefined && next.length >= max) {
        setNote(`Up to ${max} only.`);
        break;
      }
      if (next.some((t) => t.toLowerCase() === r.toLowerCase())) {
        setNote(`“${r}” is already added.`);
        continue;
      }
      const problem = validate?.(r);
      if (problem) {
        setNote(problem);
        continue;
      }
      next.push(r);
    }
    if (next.length !== tags.length) {
      set(next);
      setDraft("");
    }
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === "," || (e.key === "Tab" && draft)) && draft.trim()) {
      e.preventDefault();
      setNote(undefined);
      add([draft]);
      return;
    }
    if (e.key === "Backspace" && !draft && tags.length) {
      e.preventDefault();
      if (marked) {
        set(tags.slice(0, -1));
        setMarked(false);
      } else setMarked(true);
      return;
    }
    if (e.key === "Escape") {
      setMarked(false);
      setDraft("");
    } else if (marked) setMarked(false);
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/[,\n;]/.test(text)) return;
    e.preventDefault();
    setNote(undefined);
    add(text.split(/[,\n;]/));
  };
  return (
    <Field
      label={label}
      hideLabel={hideLabel}
      description={description}
      error={shown}
      controlId={controlId}
      descriptionId={descriptionId}
      errorId={errorId}
      className={className}
      style={style}
      classNames={classNames}
    >
      <FieldFrame
        size={size}
        classNames={classNames}
        invalid={!!error}
        disabled={disabled}
        className="h-auto flex-wrap gap-1 py-[var(--pui-size-1,0.25rem)] [--pui-nest-inset:calc((var(--_field-height)-1.5rem)/2)] [--pui-nest-radius:var(--pui-field-radius,var(--pui-radius-control))]"
      >
        {tags.map((t, i) => (
          <FieldChip
            key={t}
            flip={t}
            className={classNames?.chip}
            textClassName={classNames?.chipText}
            removeClassName={classNames?.remove}
            removeLabel={`Remove ${t}`}
            active={marked && i === tags.length - 1}
            disabled={disabled}
            onRemove={() => {
              set(tags.filter((x) => x !== t));
              input.current?.focus();
            }}
          >
            {t}
          </FieldChip>
        ))}
        <input
          ref={controlRef}
          data-slot="tag-input"
          {...aria}
          value={draft}
          disabled={disabled || full}
          placeholder={full ? `${max} of ${max}` : tags.length ? undefined : placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            setMarked(false);
            if (note) setNote(undefined);
          }}
          onKeyDown={onKey}
          onPaste={onPaste}
          onBlur={() => {
            setMarked(false);
            if (draft.trim()) add([draft]);
          }}
          // the typing area is one chip tall, so chips and text share one centred row and the frame keeps the field height
          className={cn(fieldControlClass, "min-h-6 min-w-[8ch] basis-[8ch]", classNames?.input)}
        />
      </FieldFrame>
      <span data-slot="tag-input-status" className={cn("sr-only", classNames?.status)} aria-live="polite">
        {tags.length} {tags.length === 1 ? "tag" : "tags"}
        {marked ? `; Backspace again removes ${tags.at(-1)}` : ""}
      </span>
    </Field>
  );
}

export default TagInput;
