"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useLayoutEffect } from "react";
import type { ReactNode, Ref, CSSProperties } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  KeyRound,
  MoreHorizontal,
  Plus,
  ShieldAlert,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import { Alert } from "@/components/alert/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from "@/components/alert-dialog/alert-dialog";
import { Avatar } from "@/components/avatar/avatar";
import { Badge } from "@/components/badge/badge";
import { BillingToggle } from "@/components/billing-toggle/billing-toggle";
import { Button } from "@/components/button/button";
import { Combobox } from "@/components/combobox/combobox";
import { CopyButton } from "@/components/copy-button/copy-button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/dialog/dialog";
import { DropdownMenu } from "@/components/dropdown-menu/dropdown-menu";
import { HoldToConfirm } from "@/components/hold-to-confirm/hold-to-confirm";
import { Input } from "@/components/input/input";
import { Item } from "@/components/item/item";
import { RadioCards } from "@/components/radio-cards/radio-cards";
import { Select } from "@/components/select/select";
import { Switch } from "@/components/switch/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table/table";
import { TagInput } from "@/components/tag-input/tag-input";
import { ToastStack, ToastStackProvider, useToastStack } from "@/components/toast/toast";
import { UsageMeter, type UsageMeterSegment } from "@/components/usage-meter/usage-meter";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { cn } from "@/lib/utils";
import styles from "./settings.module.css";

export type SettingsSection = "profile" | "workspace" | "members" | "billing" | "notifications" | "api" | "danger";
export type BillingPeriod = "monthly" | "yearly";

/** Everything the save bar saves: profile, workspace and email notifications. */
export interface SettingsValues {
  name: string;
  email: string;
  timeZone: string;
  workspace?: string;
  slug?: string;
  /** Additional profile values, keyed by profileFields. */
  profile?: Record<string, string>;
  /** On or off per notification id. */
  notifications: Record<string, boolean>;
}
export interface SettingsProfileField {
  id: string;
  label: string;
  optional?: boolean;
  description?: string;
  autoComplete?: string;
  maxLength?: number;
  validate?: (value: string) => string | undefined;
}

export interface SettingsMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  pending?: boolean;
}
export interface SettingsRole {
  value: string;
  label: string;
}
/** A plan's price per seat per month for each period; null when it is quoted by sales. */
export interface SettingsPlan {
  id: string;
  name: string;
  detail?: string;
  price: { monthly: number; yearly: number } | null;
}
export interface SettingsUsage {
  id: string;
  label: string;
  unit?: string;
  limit: number;
  warnAt?: number;
  segments: UsageMeterSegment[];
}
/** A key as listed after creation: only its start is ever shown again. */
export interface SettingsApiKey {
  id: string;
  name: string;
  prefix: string;
  created: number;
}
export interface SettingsNotification {
  id: string;
  label: string;
  description: string;
}

export type SettingsClassNames = Partial<
  Record<
    | "button"
    | "avatar"
    | "name"
    | "email"
    | "profileField"
    | "workspace"
    | "slug"
    | "timeZone"
    | "inviteEmails"
    | "role"
    | "dialog"
    | "table"
    | "tableHeader"
    | "tableBody"
    | "tableRow"
    | "confirmation"
    | "confirmationFooter"
    | "confirmationCancel"
    | "confirmationAction"
    | "memberActions"
    | "badge"
    | "period"
    | "plans"
    | "usage"
    | "notificationSwitch"
    | "copyKey"
    | "alert"
    | "keyName"
    | "delete"
    | "toasts"
    | "root"
    | "layout"
    | "navigation"
    | "heading"
    | "title"
    | "items"
    | "item"
    | "unsavedLabel"
    | "fieldAttention"
    | "dirty"
    | "viewport"
    | "body"
    | "savedAt"
    | "column"
    | "photoRow"
    | "optional"
    | "domain"
    | "inviteIcon"
    | "inviteForm"
    | "inviteError"
    | "roleHeader"
    | "actionsHeader"
    | "actionsLabel"
    | "personCell"
    | "person"
    | "personBody"
    | "personName"
    | "personEmail"
    | "roleLabel"
    | "memberActionsIcon"
    | "planName"
    | "planChange"
    | "planDescription"
    | "wantedPlan"
    | "notification"
    | "notificationBody"
    | "notificationLabel"
    | "notificationDescription"
    | "keyCreateIcon"
    | "secretBody"
    | "secretRow"
    | "secret"
    | "keyForm"
    | "keysEmpty"
    | "key"
    | "keyIcon"
    | "keyBody"
    | "keyTitle"
    | "keyMeta"
    | "keyPrefix"
    | "keyCreated"
    | "danger"
    | "deleteError"
    | "announcement"
    | "saveRegion"
    | "saveBar"
    | "saveDescription"
    | "saveError"
    | "saved"
    | "invalid"
    | "section"
    | "sectionHeader"
    | "sectionIdentity"
    | "sectionHeading"
    | "sectionDescription",
    string
  >
>;
export interface SettingsProps {
  classNames?: SettingsClassNames;
  style?: CSSProperties;
  /** Use tabs inside an app with its own navigation; none when the host routes sections: then the block sits flush in
   *  the host's page (its background, its left edge, its heading) and shows only the section's form. */
  navigation?: "rail" | "tabs" | "none";
  /** The heading over the section list (rail, tabs). Null leaves it to the host; with navigation none the host's page
   *  has the heading and this is not shown. */
  heading?: ReactNode | null;
  /** Beside the heading, outside it: a status the page owns, such as where saves are kept ("Saves stay in this
   *  browser"). Shown only with a heading. */
  headingAside?: ReactNode;
  /** Extra profile Inputs use the same draft, validation and save handler. */
  profileFields?: SettingsProfileField[];
  /** The section in view, controlled or not. */
  section?: SettingsSection;
  defaultSection?: SettingsSection;
  onSectionChange?: (section: SettingsSection) => void;
  /** The saved values, controlled (update them from onValuesChange) or not. */
  values?: SettingsValues;
  defaultValues: SettingsValues;
  /** An optional restored draft; applied once on mount. */
  defaultDraft?: Partial<SettingsValues>;
  onValuesChange?: (values: SettingsValues) => void;
  /** Persist the draft. Reject to keep the save bar with your message. */
  onSave: (values: SettingsValues, changed: string[]) => Promise<void>;
  /** Shows "Change photo" next to the avatar. */
  onPhotoChange?: () => void;
  /** IANA zones for the time zone field; an empty list leaves the field out. */
  timeZones?: string[];
  /** The address the workspace URL sits under: "northline.example". */
  domain?: string;
  /** Email notifications with their switches. */
  notificationOptions?: SettingsNotification[];
  /** Members, controlled or not; the Members section appears with them. */
  members?: SettingsMember[];
  defaultMembers?: SettingsMember[];
  onMembersChange?: (members: SettingsMember[]) => void;
  /** Roles that can be given; "owner" is shown but never offered. */
  roles?: SettingsRole[];
  /** Send invitations; resolve with the new (pending) members. */
  onInvite?: (emails: string[], role: string) => Promise<SettingsMember[]>;
  onRoleChange?: (memberId: string, role: string) => Promise<void>;
  onRemoveMember?: (memberId: string) => Promise<void>;
  /** Plans; the Billing section appears with them. */
  plans?: SettingsPlan[];
  plan?: string;
  defaultPlan?: string;
  period?: BillingPeriod;
  defaultPeriod?: BillingPeriod;
  /** Change plan or billing period; resolve once billing has it. */
  onPlanChange?: (plan: string, period: BillingPeriod) => Promise<void>;
  /** Seats the plan includes (the seats meter counts members). */
  seats?: number;
  /** Other metered allowances. */
  usage?: SettingsUsage[];
  /** API keys, controlled or not; the API keys section appears with them. */
  apiKeys?: SettingsApiKey[];
  defaultApiKeys?: SettingsApiKey[];
  onApiKeysChange?: (keys: SettingsApiKey[]) => void;
  /** Create a key; resolve with it and its secret, which is shown once. */
  onCreateKey?: (name: string) => Promise<{ key: SettingsApiKey; secret: string }>;
  onRevokeKey?: (keyId: string) => Promise<void>;
  /** Schedule the workspace for deletion; the Danger zone appears with it. */
  onDeleteWorkspace?: () => Promise<void>;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const ROLES: SettingsRole[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];
const ZONES = [
  "Europe/Berlin",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];
const NOTIFICATIONS: SettingsNotification[] = [
  { id: "digest", label: "Weekly digest", description: "Every Monday at 09:00 in your time zone." },
  { id: "mentions", label: "Mentions and replies", description: "When someone @mentions you or replies to your note." },
  { id: "incidents", label: "Incidents", description: "Outages and failed webhooks, as they happen." },
  { id: "product", label: "Product updates", description: "New features, about once a month." },
];
const ICONS: Record<SettingsSection, ReactNode> = {
  profile: <User className="size-4" />,
  workspace: <Building2 className="size-4" />,
  members: <Users className="size-4" />,
  billing: <CreditCard className="size-4" />,
  notifications: <Bell className="size-4" />,
  api: <KeyRound className="size-4" />,
  danger: <ShieldAlert className="size-4" />,
};
const LABELS: Record<SettingsSection, string> = {
  profile: "Profile",
  workspace: "Workspace",
  members: "Members",
  billing: "Billing",
  notifications: "Notifications",
  api: "API keys",
  danger: "Danger zone",
};
const FIELD_NAMES: Record<string, string> = {
  name: "name",
  email: "email",
  timeZone: "time zone",
  workspace: "workspace name",
  slug: "workspace URL",
};
const isEmail = (v: string) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v.trim());
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const day = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

function useControllable<T>(value: T | undefined, initial: T, onChange?: (next: T) => void) {
  const [own, setOwn] = useState<T>(initial);
  const current = value !== undefined ? value : own;
  const latest = useRef(current);
  latest.current = current;
  const set = (next: T | ((current: T) => T)) => {
    const resolved = typeof next === "function" ? (next as (current: T) => T)(latest.current) : next;
    latest.current = resolved;
    if (value === undefined) setOwn(resolved);
    onChange?.(resolved);
  };
  return [current, set] as const;
}

/**
 * Workspace settings: a section list and one section at a time. Profile, workspace and notification edits collect in
 * a draft and a save bar offers Save or Discard; your onSave's promise drives it. Invites, role changes, plan changes,
 * keys and deletion each call their own handler and confirm with a toast; destructive ones ask first.
 */
export function Settings(props: SettingsProps) {
  return (
    <ToastStackProvider>
      <SettingsBody {...props} />
    </ToastStackProvider>
  );
}

function SettingsBody({
  navigation = "rail",
  heading = "Settings",
  headingAside,
  profileFields = [],
  section: sectionProp,
  defaultSection = "profile",
  onSectionChange,
  values,
  defaultValues,
  defaultDraft = {},
  onValuesChange,
  onSave,
  onPhotoChange,
  timeZones = ZONES,
  domain = "app.example.com",
  notificationOptions = NOTIFICATIONS,
  members: membersProp,
  defaultMembers,
  onMembersChange,
  roles = ROLES,
  onInvite,
  onRoleChange,
  onRemoveMember,
  plans,
  plan: planProp,
  defaultPlan,
  period: periodProp,
  defaultPeriod = "yearly",
  onPlanChange,
  seats,
  usage = [],
  apiKeys: keysProp,
  defaultApiKeys,
  onApiKeysChange,
  onCreateKey,
  onRevokeKey,
  onDeleteWorkspace,
  className,
  classNames,
  style,
  ref,
}: SettingsProps) {
  const { toast } = useToastStack();
  const root = useRef<HTMLDivElement | null>(null);
  const composedRef = useComposedRef(root, ref);
  const pendingFocus = useRef<string | null>(null);
  const hasWorkspace =
    (values ?? defaultValues).workspace !== undefined || (values ?? defaultValues).slug !== undefined;
  const hasMembers = !!(membersProp ?? defaultMembers);
  const hasKeys = !!(keysProp ?? defaultApiKeys);
  const sections: SettingsSection[] = [
    "profile",
    ...(hasWorkspace ? ["workspace" as const] : []),
    ...(hasMembers ? ["members" as const] : []),
    ...(plans?.length ? ["billing" as const] : []),
    "notifications",
    ...(hasKeys ? ["api" as const] : []),
    ...(onDeleteWorkspace ? ["danger" as const] : []),
  ];
  const [sectionRaw, setSection] = useControllable(sectionProp, defaultSection, onSectionChange);
  const section = sections.includes(sectionRaw) ? sectionRaw : "profile";

  // ── the draft: edits over the saved values ─────────────────────────────────
  const [saved, setSaved] = useControllable(values, defaultValues, onValuesChange);
  const [edits, setEdits] = useState<Partial<SettingsValues>>(defaultDraft);
  const draft: SettingsValues = {
    ...saved,
    ...edits,
    notifications: { ...saved.notifications, ...edits.notifications },
    profile: { ...saved.profile, ...edits.profile },
  };
  const changed = [
    ...(Object.keys(FIELD_NAMES) as (keyof typeof FIELD_NAMES)[]).filter(
      (k) => draft[k as keyof SettingsValues] !== saved[k as keyof SettingsValues],
    ),
    ...profileFields
      .filter((field) => (draft.profile?.[field.id] ?? "") !== (saved.profile?.[field.id] ?? ""))
      .map((field) => `profile.${field.id}`),
    ...notificationOptions
      .filter((n) => !!draft.notifications[n.id] !== !!saved.notifications[n.id])
      .map((n) => `notifications.${n.id}`),
  ];
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ message: string; field?: string } | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const saveBarRef = useRef<HTMLDivElement>(null);
  const [toastBottom, setToastBottom] = useState(0);
  const saveBarVisible = changed.length > 0 || showSaved;
  useLayoutEffect(() => {
    const bar = saveBarRef.current,
      host = root.current;
    if (!saveBarVisible || !bar || !host) return;
    const measure = () =>
      setToastBottom(Math.max(0, host.getBoundingClientRect().bottom - bar.getBoundingClientRect().top));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    observer.observe(host);
    host.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      host.removeEventListener("scroll", measure, true);
    };
  }, [saveBarVisible]);

  const [elapsed, setElapsed] = useState(0);
  const fieldSection = (key: string): SettingsSection =>
    key.startsWith("notifications.") ? "notifications" : ["workspace", "slug"].includes(key) ? "workspace" : "profile";
  const knownFields = [
    "name",
    "email",
    ...(hasWorkspace ? ["workspace", "slug"] : []),
    ...profileFields.map((field) => `profile.${field.id}`),
  ];
  const clearFieldError = (key: string) => setSaveError((error) => (error?.field === key ? null : error));
  const set = <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => {
    setEdits((edits) => ({ ...edits, [key]: value }));
    setShowSaved(false);
    clearFieldError(key);
  };
  const setProfile = (key: string, value: string) => {
    setEdits((edits) => ({ ...edits, profile: { ...edits.profile, [key]: value } }));
    setShowSaved(false);
    clearFieldError(`profile.${key}`);
  };
  const errors: Record<string, string | undefined> = {
    name: draft.name.trim() ? undefined : "Enter your name.",
    email: isEmail(draft.email) ? undefined : "Enter a full email address, like name@company.com.",
    ...(hasWorkspace
      ? {
          workspace: draft.workspace?.trim() ? undefined : "Give the workspace a name.",
          slug: /^[a-z0-9-]{3,32}$/.test(draft.slug ?? "")
            ? undefined
            : "Use 3–32 lowercase letters, numbers or dashes.",
        }
      : {}),
    ...Object.fromEntries(
      profileFields.map((field) => {
        const value = draft.profile?.[field.id] ?? "";
        return [
          `profile.${field.id}`,
          !field.optional && !value.trim()
            ? `Enter ${field.label.toLowerCase()}.`
            : field.optional && !value.trim()
              ? undefined
              : field.validate?.(value),
        ];
      }),
    ),
  };
  const invalid = Object.values(errors).some(Boolean);
  if (saveError?.field) errors[saveError.field] = saveError.message;
  const focusHeading = () =>
    root.current?.querySelector<HTMLElement>('[data-slot="settings-section-heading"]')?.focus({ preventScroll: true });
  const focusField = (field: string) =>
    root.current?.querySelector<HTMLElement>(`[data-settings-field="${CSS.escape(field)}"]`)?.focus();
  useEffect(() => {
    const selected = root.current?.querySelector<HTMLElement>('[data-slot="item"][data-state="selected"]');
    const row = selected?.parentElement;
    if (selected && row && row.scrollWidth > row.clientWidth) {
      const target = selected.getBoundingClientRect();
      const viewport = row.getBoundingClientRect();
      // Scroll this row only. scrollIntoView would also move the host page when the block is in a preview frame.
      if (target.left < viewport.left) row.scrollBy({ left: target.left - viewport.left });
      else if (target.right > viewport.right) row.scrollBy({ left: target.right - viewport.right });
    }
    if (pendingFocus.current) {
      focusField(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [section]);
  useEffect(() => {
    if (!showSaved) return;
    const timer = setTimeout(() => setShowSaved(false), 1600);
    return () => clearTimeout(timer);
  }, [showSaved]);
  useEffect(() => {
    if (!saving) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [saving]);
  useEffect(() => {
    if (saving) {
      setAnnouncement("Saving");
      return;
    }
    if (!changed.length) return;
    const timer = setTimeout(() => setAnnouncement(plural(changed.length, "unsaved change")), 500);
    return () => clearTimeout(timer);
  }, [changed.length, saving]);
  async function save() {
    if (invalid || saving) return;
    const submitted = { ...draft, name: draft.name.trim(), email: draft.email.trim() };
    const submittedEdits = edits;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(submitted, changed);
      setSaved(submitted);
      // A handler may be pending while the person keeps typing. Only remove the edits it actually saved.
      setEdits((latest) => {
        const remaining = { ...latest };
        for (const key of Object.keys(submittedEdits) as (keyof SettingsValues)[]) {
          if (key === "profile" || key === "notifications") {
            const values: Record<string, string | boolean> = { ...latest[key] };
            for (const id of Object.keys(submittedEdits[key] ?? {})) {
              if (latest[key]?.[id] === submittedEdits[key]?.[id]) delete values[id];
            }
            if (Object.keys(values).length) Object.assign(remaining, { [key]: values });
            else delete remaining[key];
          } else if (latest[key] === submittedEdits[key]) delete remaining[key];
        }
        return remaining;
      });
      setSavedAt(new Date());
      setShowSaved(true);
      setAnnouncement("Saved");
      focusHeading();
    } catch (error) {
      const tagged = error as { field?: string };
      const field = tagged?.field && knownFields.includes(tagged.field) ? tagged.field : undefined;
      setSaveError({ message: message(error, "Settings could not be saved. Try again."), field });
      if (field && fieldSection(field) === section) requestAnimationFrame(() => focusField(field));
    } finally {
      setSaving(false);
    }
  }
  const discard = () => {
    setEdits({});
    setSaveError(null);
    setShowSaved(false);
    setAnnouncement("Changes discarded.");
    focusHeading();
  };
  const goToField = () => {
    if (!saveError?.field) return;
    pendingFocus.current = saveError.field;
    setSection(fieldSection(saveError.field));
  };

  // ── members ───────────────────────────────────────────────────────────────
  const [members, setMembers] = useControllable(membersProp, defaultMembers ?? [], onMembersChange);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState(
    roles.find((r) => r.value === "member")?.value ?? roles.at(-1)?.value ?? "",
  );
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SettingsMember | null>(null);
  const [busyRemove, setBusyRemove] = useState(false);
  const roleLabel = (v: string) => roles.find((r) => r.value === v)?.label ?? v;
  async function sendInvites() {
    if (!onInvite || !invite.length) return;
    setInviting(true);
    setInviteError(null);
    try {
      const added = await onInvite(invite, inviteRole);
      setMembers((current) => [...current, ...added]);
      toast({
        type: "success",
        title: `Invited ${plural(added.length, "person", "people")}`,
        description: "Their link expires in 7 days.",
      });
      setInvite([]);
      setInviteOpen(false);
    } catch (e) {
      setInviteError(message(e, "The invitations were not sent. Try again."));
    } finally {
      setInviting(false);
    }
  }
  const roleRequests = useRef(new Map<string, symbol>());
  async function changeRole(m: SettingsMember, role: string) {
    const request = Symbol();
    roleRequests.current.set(m.id, request);
    setMembers((current) => current.map((x) => (x.id === m.id ? { ...x, role } : x)));
    try {
      await onRoleChange?.(m.id, role);
      if (roleRequests.current.get(m.id) !== request) return;
      toast({ type: "success", title: `${m.name} is now ${roleLabel(role).toLowerCase()}` });
    } catch (e) {
      if (roleRequests.current.get(m.id) !== request) return;
      setMembers((current) => current.map((x) => (x.id === m.id && x.role === role ? { ...x, role: m.role } : x)));
      toast({ type: "error", title: `${m.name}'s role did not change`, description: message(e, "Try again.") });
    } finally {
      if (roleRequests.current.get(m.id) === request) roleRequests.current.delete(m.id);
    }
  }
  async function removeMember() {
    if (!removing) return;
    setBusyRemove(true);
    try {
      await onRemoveMember?.(removing.id);
      setMembers((current) => current.filter((x) => x.id !== removing.id));
      toast({
        type: "success",
        title: removing.pending ? `Invitation to ${removing.email} withdrawn` : `${removing.name} removed`,
      });
      setRemoving(null);
    } catch (e) {
      toast({ type: "error", title: "Nobody was removed", description: message(e, "Try again.") });
    } finally {
      setBusyRemove(false);
    }
  }

  // ── billing ───────────────────────────────────────────────────────────────
  const [plan, setPlan] = useControllable(planProp, defaultPlan ?? plans?.[0]?.id ?? "", undefined);
  const [period, setPeriod] = useControllable<BillingPeriod>(periodProp, defaultPeriod, undefined);
  const [choice, setChoice] = useState<{ plan: string; period: BillingPeriod } | null>(null);
  const [switching, setSwitching] = useState(false);
  const wanted = choice ?? { plan, period };
  const pending = wanted.plan !== plan || wanted.period !== period;
  const planName = (id: string) => plans?.find((p) => p.id === id)?.name ?? id;
  const yearlySaving = Math.max(
    0,
    ...(plans ?? []).map((p) =>
      p.price && p.price.monthly > 0 ? Math.round((1 - p.price.yearly / p.price.monthly) * 100) : 0,
    ),
  );
  async function switchPlan() {
    setSwitching(true);
    try {
      await onPlanChange?.(wanted.plan, wanted.period);
      setPlan(wanted.plan);
      setPeriod(wanted.period);
      setChoice(null);
      toast({ type: "success", title: `You're on ${planName(wanted.plan)}, billed ${wanted.period}` });
    } catch (e) {
      toast({ type: "error", title: "Your plan did not change", description: message(e, "Try again.") });
    } finally {
      setSwitching(false);
    }
  }

  // ── API keys ──────────────────────────────────────────────────────────────
  const [keys, setKeys] = useControllable(keysProp, defaultApiKeys ?? [], onApiKeysChange);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const [revoking, setRevoking] = useState<SettingsApiKey | null>(null);
  const [busyRevoke, setBusyRevoke] = useState(false);
  const changeKeyOpen = (open: boolean) => {
    setKeyOpen(open);
    if (!open) {
      setSecret(null);
      setKeyError(null);
      setKeyName("");
    }
  };
  async function createKey() {
    if (!onCreateKey) return;
    if (!keyName.trim()) {
      setKeyError("Name the key after where it is used: Production, CI.");
      return;
    }
    setCreating(true);
    setKeyError(null);
    try {
      const { key, secret: value } = await onCreateKey(keyName.trim());
      setKeys((current) => [...current, key]);
      setSecret({ name: key.name, value });
      setKeyName("");
    } catch (e) {
      setKeyError(message(e, "The key was not created. Try again."));
    } finally {
      setCreating(false);
    }
  }
  async function revokeKey() {
    if (!revoking) return;
    setBusyRevoke(true);
    try {
      await onRevokeKey?.(revoking.id);
      setKeys((current) => current.filter((k) => k.id !== revoking.id));
      toast({ type: "success", title: `Revoked ${revoking.name}`, description: "Requests with it now fail." });
      setRevoking(null);
    } catch (e) {
      toast({ type: "error", title: `${revoking.name} is still active`, description: message(e, "Try again.") });
    } finally {
      setBusyRevoke(false);
    }
  }

  // ── danger zone ───────────────────────────────────────────────────────────
  const [deletion, setDeletion] = useState<"idle" | "working" | "scheduled" | "failed">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  async function deleteWorkspace() {
    if (!onDeleteWorkspace) return;
    setDeletion("working");
    setDeleteError(null);
    try {
      await onDeleteWorkspace();
      setDeletion("scheduled");
      toast({ type: "warning", title: "Workspace deletion scheduled", description: "You have 7 days to cancel." });
    } catch (e) {
      setDeletion("failed");
      setDeleteError(message(e, "The workspace was not scheduled for deletion. Try again."));
    }
  }

  const active = members.filter((m) => !m.pending).length;
  const invited = members.length - active;

  return (
    <div
      ref={composedRef}
      style={style}
      data-slot="settings"
      data-navigation={navigation}
      data-section={section}
      className={cn(
        "@container relative min-h-0 text-ink",
        // its own screen fills the height and scrolls inside; inside your page it flows with the page
        navigation !== "none" && "h-full bg-canvas",
        styles.root,
        classNames?.root,
        className,
      )}
    >
      <div data-slot="settings-layout" className={cn(styles.layout, classNames?.layout)}>
        {navigation !== "none" && (
          <nav
            data-slot="settings-navigation"
            aria-label="Settings sections"
            className={cn(styles.navigation, classNames?.navigation)}
          >
            {heading != null && (
              <div data-slot="settings-heading" className={cn(styles.heading, classNames?.heading)}>
                <h1
                  data-slot="settings-title"
                  className={cn(
                    "font-display text-2xl font-title tracking-[var(--pui-tracking-display)]",
                    classNames?.title,
                  )}
                >
                  {heading}
                </h1>
                {headingAside}
              </div>
            )}
            <div data-slot="settings-items" className={cn(styles.items, classNames?.items)}>
              {sections.map((s) => (
                <Item
                  key={s}
                  size="sm"
                  media={ICONS[s]}
                  title={
                    <>
                      {LABELS[s]}
                      {changed.some((key) => fieldSection(key) === s) && (
                        <span data-slot="settings-unsavedLabel" className={cn("sr-only", classNames?.unsavedLabel)}>
                          {" "}
                          (unsaved)
                        </span>
                      )}
                    </>
                  }
                  meta={
                    saveError?.field && fieldSection(saveError.field) === s ? (
                      <span
                        data-slot="settings-fieldAttention"
                        className={cn("text-red", classNames?.fieldAttention)}
                        aria-label="Field needs attention"
                      >
                        ▲
                      </span>
                    ) : changed.some((key) => fieldSection(key) === s) ? (
                      <span
                        data-slot="settings-dirty"
                        data-state="dirty"
                        className={cn("block size-1.5 rounded-full bg-accent", classNames?.dirty)}
                        aria-hidden
                      />
                    ) : undefined
                  }
                  selected={section === s}
                  onSelect={() => setSection(s)}
                  className={cn("shrink-0", classNames?.item)}
                />
              ))}
            </div>
          </nav>
        )}

        <div
          data-slot="settings-viewport"
          className={cn(
            "relative flex min-h-0 min-w-0 flex-col",
            // inside your page the page scrolls, so the save bar floats at the bottom of the window while you edit
            navigation !== "none" && "overflow-y-auto",
            classNames?.viewport,
          )}
        >
          <div data-slot="settings-body" className={cn("min-h-0 flex-1", classNames?.body)}>
            <SavedCaption.Provider
              value={
                savedAt && (
                  <p
                    data-slot="settings-saved-at"
                    className={cn("text-caption text-ink-3 tabular-nums", classNames?.savedAt)}
                  >
                    Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )
              }
            >
              <div data-slot="settings-column" className={cn(styles.column, classNames?.column)}>
                {section === "profile" && (
                  <Section classNames={classNames} title="Profile" description="Your name and how to reach you.">
                    <div data-slot="settings-photoRow" className={cn("flex items-center gap-4", classNames?.photoRow)}>
                      <Avatar className={classNames?.avatar} name={draft.name || "?"} size="xl" />
                      {onPhotoChange && (
                        <Button className={classNames?.button} variant="secondary" size="sm" onClick={onPhotoChange}>
                          Change photo
                        </Button>
                      )}
                    </div>
                    <Input
                      className={classNames?.name}
                      label="Name"
                      data-settings-field="name"
                      required
                      autoComplete="name"
                      value={draft.name}
                      onChange={(e) => set("name", e.target.value)}
                      error={errors.name}
                    />
                    {profileFields.map((field) => (
                      <Input
                        className={classNames?.profileField}
                        key={field.id}
                        label={
                          <>
                            {field.label}
                            {field.optional && (
                              <span data-slot="settings-optional" className={cn("text-ink-3", classNames?.optional)}>
                                {" "}
                                (optional)
                              </span>
                            )}
                          </>
                        }
                        data-settings-field={`profile.${field.id}`}
                        name={field.id}
                        required={!field.optional}
                        autoComplete={field.autoComplete}
                        maxLength={field.maxLength}
                        description={field.description}
                        value={draft.profile?.[field.id] ?? ""}
                        onChange={(event) => setProfile(field.id, event.target.value)}
                        error={errors[`profile.${field.id}`]}
                      />
                    ))}
                    <Input
                      className={classNames?.email}
                      label="Email"
                      data-settings-field="email"
                      required
                      dir="ltr"
                      type="email"
                      autoComplete="email"
                      value={draft.email}
                      onChange={(e) => set("email", e.target.value)}
                      error={errors.email}
                      description="Where account email goes."
                    />
                    {timeZones.length > 0 && (
                      <Combobox
                        className={classNames?.timeZone}
                        label="Time zone"
                        options={timeZones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }))}
                        value={draft.timeZone}
                        onValueChange={(v) => v && set("timeZone", v)}
                        description="Dates and times show in this zone."
                      />
                    )}
                  </Section>
                )}

                {section === "workspace" && (
                  <Section
                    classNames={classNames}
                    title="Workspace"
                    description={`Shared by everyone in ${saved.workspace}.`}
                  >
                    <Input
                      className={classNames?.workspace}
                      label="Workspace name"
                      data-settings-field="workspace"
                      value={draft.workspace ?? ""}
                      onChange={(e) => set("workspace", e.target.value)}
                      error={errors.workspace}
                    />
                    <Input
                      className={classNames?.slug}
                      label="URL"
                      data-settings-field="slug"
                      dir="ltr"
                      value={draft.slug ?? ""}
                      onChange={(e) => set("slug", e.target.value.toLowerCase())}
                      leading={
                        <span data-slot="settings-domain" className={cn("text-ink-3", classNames?.domain)}>
                          {domain}/
                        </span>
                      }
                      error={errors.slug}
                      description="Changing it breaks old links to this workspace."
                    />
                  </Section>
                )}

                {section === "members" && (
                  <Section
                    classNames={classNames}
                    title="Members"
                    description={`${plural(active, "person", "people")}${invited ? `, ${invited} invited` : ""} · roles decide who can edit billing and API keys.`}
                    action={
                      onInvite && (
                        <Dialog
                          open={inviteOpen}
                          onOpenChange={(o) => {
                            setInviteOpen(o);
                            if (!o) setInviteError(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button className={classNames?.button} size="sm">
                              <Plus data-slot="settings-inviteIcon" className={cn("size-4", classNames?.inviteIcon)} />
                              Invite
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            className={classNames?.dialog}
                            title="Invite teammates"
                            description="They get an email with a link that expires in 7 days."
                            dismissible={!inviting}
                            footer={
                              <>
                                <Button
                                  className={classNames?.button}
                                  variant="ghost"
                                  onClick={() => setInviteOpen(false)}
                                  disabled={inviting}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  className={classNames?.button}
                                  disabled={!invite.length}
                                  loading={inviting}
                                  onClick={sendInvites}
                                >
                                  Send {invite.length || ""} invite{invite.length === 1 ? "" : "s"}
                                </Button>
                              </>
                            }
                          >
                            <div data-slot="settings-inviteForm" className={cn("grid gap-4", classNames?.inviteForm)}>
                              <TagInput
                                className={classNames?.inviteEmails}
                                label="Emails"
                                value={invite}
                                onValueChange={setInvite}
                                placeholder="name@company.com, then Enter"
                                validate={(v) =>
                                  isEmail(v)
                                    ? members.some((m) => m.email === v.trim())
                                      ? "Already a member."
                                      : undefined
                                    : "Not an email address."
                                }
                              />
                              <Select
                                className={classNames?.role}
                                label="Role"
                                options={roles.filter((r) => r.value !== "owner")}
                                value={inviteRole}
                                onValueChange={setInviteRole}
                              />
                              {inviteError && (
                                <p
                                  data-slot="settings-inviteError"
                                  role="alert"
                                  className={cn("text-sm text-red", classNames?.inviteError)}
                                >
                                  {inviteError}
                                </p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )
                    }
                  >
                    <Table className={classNames?.table}>
                      <TableHeader className={classNames?.tableHeader}>
                        <TableRow className={classNames?.tableRow}>
                          <TableHead>Person</TableHead>
                          <TableHead className={cn("w-[160px]", classNames?.roleHeader)}>Role</TableHead>
                          <TableHead className={cn("w-10", classNames?.actionsHeader)}>
                            <span data-slot="settings-actionsLabel" className={cn("sr-only", classNames?.actionsLabel)}>
                              Actions
                            </span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className={classNames?.tableBody}>
                        {members.map((m) => (
                          <TableRow className={classNames?.tableRow} key={m.id} data-member={m.id}>
                            <TableCell className={cn("min-w-0", classNames?.personCell)}>
                              <span
                                data-slot="settings-person"
                                className={cn("flex min-w-0 items-center gap-3", classNames?.person)}
                              >
                                <Avatar className={classNames?.avatar} name={m.name} src={m.avatar} size="sm" />
                                <span
                                  data-slot="settings-personBody"
                                  className={cn("flex min-w-0 flex-col", classNames?.personBody)}
                                >
                                  <span
                                    data-slot="settings-personName"
                                    className={cn(
                                      "flex items-center gap-1.5 truncate text-ink",
                                      classNames?.personName,
                                    )}
                                  >
                                    {m.name}
                                    {m.pending && (
                                      <Badge className={classNames?.badge} tone="warning" size="sm">
                                        Invited
                                      </Badge>
                                    )}
                                  </span>
                                  <span
                                    data-slot="settings-personEmail"
                                    className={cn("truncate text-xs text-ink-3", classNames?.personEmail)}
                                  >
                                    {m.email}
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              {m.role === "owner" || !onRoleChange ? (
                                <span
                                  data-slot="settings-roleLabel"
                                  className={cn("text-sm text-ink-2", classNames?.roleLabel)}
                                >
                                  {roleLabel(m.role)}
                                </span>
                              ) : (
                                <Select
                                  className={classNames?.role}
                                  label={`Role for ${m.name}`}
                                  hideLabel
                                  size="sm"
                                  options={roles.filter((r) => r.value !== "owner")}
                                  value={m.role}
                                  onValueChange={(role) => changeRole(m, role)}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {m.role !== "owner" && onRemoveMember && (
                                <DropdownMenu
                                  className={classNames?.memberActions}
                                  label={`Actions for ${m.name}`}
                                  icon={
                                    <MoreHorizontal
                                      data-slot="settings-memberActionsIcon"
                                      className={cn("size-4", classNames?.memberActionsIcon)}
                                    />
                                  }
                                  items={[
                                    {
                                      label: m.pending ? "Withdraw invitation" : "Remove from workspace",
                                      tone: "danger",
                                      onSelect: () => setRemoving(m),
                                    },
                                  ]}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <AlertDialog
                      open={!!removing}
                      onOpenChange={(o) => {
                        if (!o && !busyRemove) setRemoving(null);
                      }}
                    >
                      {removing && (
                        <AlertDialogContent
                          className={classNames?.confirmation}
                          title={
                            removing.pending
                              ? `Withdraw the invitation to ${removing.email}?`
                              : `Remove ${removing.name}?`
                          }
                          description={
                            removing.pending
                              ? "The link in their email stops working."
                              : "They lose access to every deal, report and key in this workspace right away."
                          }
                        >
                          <AlertDialogFooter className={classNames?.confirmationFooter}>
                            <AlertDialogCancel className={classNames?.confirmationCancel} disabled={busyRemove}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className={classNames?.confirmationAction}
                              loading={busyRemove}
                              onClick={(e) => {
                                e.preventDefault();
                                removeMember();
                              }}
                            >
                              {removing.pending ? "Withdraw" : "Remove"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                  </Section>
                )}

                {section === "billing" && plans && (
                  <Section
                    classNames={classNames}
                    title="Billing"
                    description="Plan, seats and usage."
                    action={
                      <BillingToggle
                        className={classNames?.period}
                        value={wanted.period}
                        onValueChange={(p) => setChoice({ plan: wanted.plan, period: p as BillingPeriod })}
                        options={[
                          { value: "monthly", label: "Monthly" },
                          {
                            value: "yearly",
                            label: "Yearly",
                            badge: yearlySaving ? `−${yearlySaving}%` : undefined,
                            activeBadge: yearlySaving ? `Saving ${yearlySaving}%` : undefined,
                          },
                        ]}
                      />
                    }
                  >
                    <RadioCards
                      hideLabel
                      className={classNames?.plans}
                      label="Plan"
                      value={wanted.plan}
                      onValueChange={(p) => setChoice({ plan: p, period: wanted.period })}
                      cards={plans.map((p) => ({
                        value: p.id,
                        detail: p.detail,
                        label: (
                          <span
                            data-slot="settings-planName"
                            className={cn("inline-flex items-center gap-1.5", classNames?.planName)}
                          >
                            {p.name}
                            {p.id === plan && (
                              <Badge className={classNames?.badge} tone="accent" size="sm">
                                Current
                              </Badge>
                            )}
                          </span>
                        ),
                        figure: p.price ? `$${p.price[wanted.period]} / seat / mo` : "Talk to us",
                      }))}
                    />
                    {pending && (
                      <div
                        data-slot="settings-planChange"
                        role="region"
                        aria-label="Plan change"
                        className={cn(
                          "m-surface flex flex-wrap items-center gap-3 rounded-card px-4 py-3",
                          classNames?.planChange,
                        )}
                      >
                        <p
                          data-slot="settings-planDescription"
                          className={cn("me-auto text-sm text-ink-2", classNames?.planDescription)}
                        >
                          Switch to{" "}
                          <span data-slot="settings-wantedPlan" className={cn("text-ink", classNames?.wantedPlan)}>
                            {planName(wanted.plan)}
                          </span>
                          , billed {wanted.period}. Changes are prorated.
                        </p>
                        <Button
                          className={classNames?.button}
                          variant="ghost"
                          size="sm"
                          onClick={() => setChoice(null)}
                          disabled={switching}
                        >
                          Keep current
                        </Button>
                        <Button
                          className={classNames?.button}
                          size="sm"
                          loading={switching}
                          onClick={switchPlan}
                          disabled={!onPlanChange}
                        >
                          Switch plan
                        </Button>
                      </div>
                    )}
                    {seats != null && (
                      <UsageMeter
                        className={classNames?.usage}
                        label="Seats"
                        limit={seats}
                        segments={[
                          { id: "active", label: "Active", value: active },
                          { id: "invited", label: "Invited", value: invited },
                        ]}
                      />
                    )}
                    {usage.map((u) => (
                      <UsageMeter
                        className={classNames?.usage}
                        key={u.id}
                        label={u.label}
                        unit={u.unit}
                        limit={u.limit}
                        warnAt={u.warnAt}
                        segments={u.segments}
                      />
                    ))}
                  </Section>
                )}

                {section === "notifications" && (
                  <Section
                    classNames={classNames}
                    title="Notifications"
                    description="Email, per workspace. Changes wait for Save."
                  >
                    {notificationOptions.map((n) => (
                      <div
                        data-slot="settings-notification"
                        key={n.id}
                        className={cn(
                          "flex items-start justify-between gap-6 border-b border-line-soft pb-4 last:border-0",
                          classNames?.notification,
                        )}
                      >
                        <div
                          data-slot="settings-notificationBody"
                          className={cn("min-w-0", classNames?.notificationBody)}
                        >
                          <p
                            data-slot="settings-notificationLabel"
                            className={cn("text-base", classNames?.notificationLabel)}
                          >
                            {n.label}
                          </p>
                          <p
                            data-slot="settings-notificationDescription"
                            className={cn("text-sm text-ink-2", classNames?.notificationDescription)}
                          >
                            {n.description}
                          </p>
                        </div>
                        <Switch
                          className={classNames?.notificationSwitch}
                          aria-label={n.label}
                          checked={!!draft.notifications[n.id]}
                          onCheckedChange={(v) => set("notifications", { ...edits.notifications, [n.id]: v })}
                        />
                      </div>
                    ))}
                  </Section>
                )}

                {section === "api" && (
                  <Section
                    classNames={classNames}
                    title="API keys"
                    description="Keys act as the workspace. After creation only the start of each key is shown."
                    action={
                      onCreateKey && (
                        <Dialog open={keyOpen} onOpenChange={changeKeyOpen}>
                          <DialogTrigger asChild>
                            <Button className={classNames?.button} size="sm">
                              <Plus
                                data-slot="settings-keyCreateIcon"
                                className={cn("size-4", classNames?.keyCreateIcon)}
                              />
                              Create key
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            className={classNames?.dialog}
                            title={secret ? `${secret.name} is ready` : "Create an API key"}
                            description={
                              secret
                                ? "Copy it now and store it somewhere safe."
                                : "It can do anything your workspace can."
                            }
                            dismissible={!creating}
                            footer={
                              secret ? (
                                <Button className={classNames?.button} onClick={() => changeKeyOpen(false)}>
                                  Done
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    className={classNames?.button}
                                    variant="ghost"
                                    onClick={() => changeKeyOpen(false)}
                                    disabled={creating}
                                  >
                                    Cancel
                                  </Button>
                                  <Button className={classNames?.button} loading={creating} onClick={createKey}>
                                    Create key
                                  </Button>
                                </>
                              )
                            }
                          >
                            {secret ? (
                              <div data-slot="settings-secretBody" className={cn("grid gap-3", classNames?.secretBody)}>
                                <div
                                  data-slot="settings-secretRow"
                                  className={cn(
                                    "m-inset flex items-center gap-2 rounded-control px-3 py-2",
                                    classNames?.secretRow,
                                  )}
                                >
                                  <code
                                    data-slot="settings-secret"
                                    className={cn("text-code min-w-0 flex-1 truncate text-ink", classNames?.secret)}
                                  >
                                    {secret.value}
                                  </code>
                                  <CopyButton className={classNames?.copyKey} value={secret.value} label="Copy key" />
                                </div>
                                <Alert className={classNames?.alert} tone="warning" icon={<TriangleAlert />}>
                                  You won't see this key again. If it is lost, revoke it and create another.
                                </Alert>
                              </div>
                            ) : (
                              <form
                                data-slot="settings-keyForm"
                                className={cn("grid gap-3", classNames?.keyForm)}
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  createKey();
                                }}
                              >
                                <Input
                                  className={classNames?.keyName}
                                  label="Key name"
                                  value={keyName}
                                  onChange={(e) => {
                                    setKeyName(e.target.value);
                                    setKeyError(null);
                                  }}
                                  placeholder="Production"
                                  error={keyError ?? undefined}
                                  autoFocus
                                />
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>
                      )
                    }
                  >
                    {keys.length === 0 && (
                      <p
                        data-slot="settings-keysEmpty"
                        className={cn(
                          "m-surface rounded-card px-4 py-6 text-center text-sm text-ink-2",
                          classNames?.keysEmpty,
                        )}
                      >
                        No keys yet. Create one for each place that calls the API.
                      </p>
                    )}
                    {keys.map((k) => (
                      <div
                        data-slot="settings-key"
                        key={k.id}
                        data-key={k.id}
                        className={cn("m-surface flex items-center gap-3 rounded-card px-4 py-3", classNames?.key)}
                      >
                        <KeyRound
                          data-slot="settings-keyIcon"
                          className={cn("size-4 shrink-0 text-ink-3", classNames?.keyIcon)}
                          aria-hidden="true"
                        />
                        <div data-slot="settings-keyBody" className={cn("min-w-0 flex-1", classNames?.keyBody)}>
                          <p data-slot="settings-keyTitle" className={cn("truncate text-base", classNames?.keyTitle)}>
                            {k.name}
                          </p>
                          <p
                            data-slot="settings-keyMeta"
                            className={cn("truncate text-xs text-ink-3", classNames?.keyMeta)}
                          >
                            <code data-slot="settings-keyPrefix" className={cn("font-mono", classNames?.keyPrefix)}>
                              {k.prefix}…
                            </code>{" "}
                            · created{" "}
                            <span
                              data-slot="settings-keyCreated"
                              className={cn("font-numeric", classNames?.keyCreated)}
                            >
                              {day(k.created)}
                            </span>
                          </p>
                        </div>
                        {onRevokeKey && (
                          <Button
                            className={classNames?.button}
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevoking(k)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                    <AlertDialog
                      open={!!revoking}
                      onOpenChange={(o) => {
                        if (!o && !busyRevoke) setRevoking(null);
                      }}
                    >
                      {revoking && (
                        <AlertDialogContent
                          className={classNames?.confirmation}
                          title={`Revoke ${revoking.name}?`}
                          description="Anything still using it stops working at once. This cannot be undone."
                        >
                          <AlertDialogFooter className={classNames?.confirmationFooter}>
                            <AlertDialogCancel className={classNames?.confirmationCancel} disabled={busyRevoke}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className={classNames?.confirmationAction}
                              loading={busyRevoke}
                              onClick={(e) => {
                                e.preventDefault();
                                revokeKey();
                              }}
                            >
                              Revoke key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                  </Section>
                )}

                {section === "danger" && (
                  <Section
                    classNames={classNames}
                    title="Danger zone"
                    description={`Deleting ${saved.workspace} removes every deal, report and key after 7 days. Until then it can be restored by support.`}
                  >
                    {deletion === "scheduled" ? (
                      <Alert className={classNames?.alert} tone="danger" title="Deletion scheduled">
                        {saved.workspace} will be deleted in 7 days. Contact support to cancel.
                      </Alert>
                    ) : (
                      <div
                        data-slot="settings-danger"
                        className={cn("grid justify-items-start gap-2", classNames?.danger)}
                      >
                        <HoldToConfirm
                          className={classNames?.delete}
                          label={deletion === "working" ? "Scheduling deletion…" : `Hold to delete ${saved.workspace}`}
                          confirmedLabel="Scheduling deletion…"
                          confirmed={deletion === "working"}
                          disabled={deletion === "working"}
                          onConfirm={deleteWorkspace}
                        />
                        {deleteError && (
                          <p
                            data-slot="settings-deleteError"
                            role="alert"
                            className={cn("text-sm text-red", classNames?.deleteError)}
                          >
                            {deleteError}
                          </p>
                        )}
                      </div>
                    )}
                  </Section>
                )}
              </div>
            </SavedCaption.Provider>
          </div>

          <span
            data-slot="settings-announcement"
            className={cn("sr-only", classNames?.announcement)}
            role="status"
            aria-live="polite"
          >
            {announcement}
          </span>
          {(changed.length > 0 || showSaved) && (
            <div
              data-slot="settings-saveRegion"
              role="region"
              aria-label={changed.length ? "Unsaved changes" : "Save result"}
              className={cn(styles.saveBar, classNames?.saveRegion)}
            >
              <div
                ref={saveBarRef}
                data-slot="settings-save-bar"
                data-state={saveError ? "failed" : showSaved && !changed.length ? "saved" : "dirty"}
                className={cn(
                  "m-overlay pointer-events-auto flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-panel px-4 py-3",
                  styles.bar,
                  classNames?.saveBar,
                )}
              >
                <p
                  data-slot="settings-saveDescription"
                  className={cn("me-auto text-sm text-ink-2", classNames?.saveDescription)}
                >
                  {saveError ? (
                    <span data-slot="settings-saveError" className={cn("text-red", classNames?.saveError)} role="alert">
                      {saveError.field ? "Not saved: 1 field needs attention" : saveError.message}
                    </span>
                  ) : saving ? (
                    elapsed > 2 ? (
                      `Saving… ${elapsed} s`
                    ) : (
                      "Saving…"
                    )
                  ) : showSaved && !changed.length ? (
                    <span data-slot="settings-saved" className={cn("text-green", classNames?.saved)}>
                      ✓ Saved
                    </span>
                  ) : (
                    <>
                      {plural(changed.length, "unsaved change")}
                      {invalid && (
                        <span data-slot="settings-invalid" className={cn("text-red", classNames?.invalid)}>
                          {" "}
                          · fix the marked field first
                        </span>
                      )}
                    </>
                  )}
                </p>
                {saveError?.field && fieldSection(saveError.field) !== section && (
                  <Button className={classNames?.button} variant="ghost" size="sm" onClick={goToField}>
                    Go to field
                  </Button>
                )}
                {changed.length > 0 && (
                  <>
                    <Button
                      className={classNames?.button}
                      variant="ghost"
                      size="sm"
                      onClick={discard}
                      disabled={saving}
                    >
                      Discard
                    </Button>
                    <Button
                      className={classNames?.button}
                      data-action="save-settings"
                      size="sm"
                      loading={saving}
                      disabled={invalid}
                      onClick={save}
                    >
                      {saveError ? "Try again" : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastStack
        className={classNames?.toasts}
        style={saveBarVisible ? { bottom: `calc(${toastBottom}px + var(--pui-space-3))` } : undefined}
        contained
        position="bottom-right"
      />
    </div>
  );
}

/** "Saved 20:41" after a save this session, shown in the current section's header (O4 §3.2). */
const SavedCaption = createContext<ReactNode>(null);

function Section({
  classNames,
  title,
  description,
  action,
  children,
}: {
  title: string;
  classNames?: SettingsClassNames;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const caption = useContext(SavedCaption);
  return (
    <section
      data-slot="settings-section"
      className={cn("flex flex-col gap-5", classNames?.section)}
      aria-labelledby={id}
    >
      <header
        data-slot="settings-sectionHeader"
        className={cn("flex flex-wrap items-end gap-4 border-b border-line-soft pb-4", classNames?.sectionHeader)}
      >
        <div data-slot="settings-sectionIdentity" className={cn("me-auto min-w-0", classNames?.sectionIdentity)}>
          <h2
            id={id}
            tabIndex={-1}
            data-slot="settings-section-heading"
            className={cn("text-heading", styles.focusTarget, classNames?.sectionHeading)}
          >
            {title}
          </h2>
          <p
            data-slot="settings-sectionDescription"
            className={cn("mt-0.5 text-sm text-ink-2", classNames?.sectionDescription)}
          >
            {description}
          </p>
        </div>
        {/* the last save's time sits in the header it belongs to, so it never pushes the form down */}
        {caption}
        {action}
      </header>
      {children}
    </section>
  );
}

export default Settings;
