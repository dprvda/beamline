// Demo-only: a workspace's settings and an in-memory stand-in for the API behind them, for the settings block's demo.
// Names, keys and amounts are invented; key secrets are obviously fake. Replace the handlers with your API.
import type {
  SettingsApiKey,
  SettingsMember,
  SettingsPlan,
  SettingsUsage,
  SettingsValues,
} from "@/blocks/settings/settings";

export const SETTINGS_VALUES: SettingsValues = {
  name: "Emma Collins",
  email: "emma@northline.example",
  timeZone: "Europe/Berlin",
  workspace: "Northline",
  slug: "northline",
  notifications: { digest: true, mentions: true, incidents: true, product: false },
};

export const SETTINGS_MEMBERS: SettingsMember[] = [
  { id: "m1", name: "Emma Collins", email: "emma@northline.example", role: "owner" },
  { id: "m2", name: "Priya Nair", email: "priya@northline.example", role: "admin" },
  { id: "m3", name: "Sam Okafor", email: "sam@northline.example", role: "member" },
  { id: "m4", name: "Lena Novak", email: "lena@northline.example", role: "viewer" },
];

export const SETTINGS_PLANS: SettingsPlan[] = [
  { id: "starter", name: "Starter", detail: "Up to 5 people", price: { monthly: 10, yearly: 8 } },
  { id: "team", name: "Team", detail: "SSO, audit log", price: { monthly: 20, yearly: 16 } },
  { id: "business", name: "Business", detail: "SAML, SCIM, SLA", price: null },
];

export const SETTINGS_USAGE: SettingsUsage[] = [
  {
    id: "requests",
    label: "API requests this month",
    unit: "k",
    limit: 500,
    warnAt: 0.8,
    segments: [
      { id: "prod", label: "Production", value: 412 },
      { id: "stg", label: "Staging", value: 38 },
    ],
  },
];

export const SETTINGS_KEYS: SettingsApiKey[] = [
  { id: "k1", name: "Production", prefix: "nl_live_7c21", created: Date.UTC(2026, 7, 12) },
  { id: "k2", name: "Staging", prefix: "nl_test_09af", created: Date.UTC(2026, 8, 2) },
];

/** A fake API: each call waits `latency` ms. A workspace URL of "taken" fails to save, to show the error path. */
export function createSettingsApi({ latency = 700 } = {}) {
  const wait = () => new Promise((r) => setTimeout(r, latency));
  let n = 0;
  return {
    onSave: async (values: SettingsValues) => {
      await wait();
      if (values.slug === "taken")
        throw Object.assign(new Error("That workspace URL is taken. Pick another."), { field: "slug" });
    },
    onInvite: async (emails: string[], role: string): Promise<SettingsMember[]> => {
      await wait();
      return emails.map((email) => ({ id: `inv-${++n}`, name: email.split("@")[0], email, role, pending: true }));
    },
    onRoleChange: async () => {
      await wait();
    },
    onRemoveMember: async () => {
      await wait();
    },
    onPlanChange: async () => {
      await wait();
    },
    onCreateKey: async (name: string) => {
      await wait();
      const id = `k-new-${++n}`;
      const secret = `nl_live_demo_${String(n).padStart(4, "0")}_not_a_real_key`;
      return { key: { id, name, prefix: secret.slice(0, 12), created: Date.now() }, secret };
    },
    onRevokeKey: async () => {
      await wait();
    },
    onDeleteWorkspace: async () => {
      await wait();
    },
  };
}

/** The ordinary profile sample has no workspace, membership, billing or API-key data. */
export const PERSONAL_SETTINGS_VALUES: SettingsValues = {
  name: "Emma Collins",
  email: "emma@northline.example",
  timeZone: "Europe/Berlin",
  notifications: { digest: true, mentions: true, incidents: true, product: false },
};

/** Demo persistence boundary: this origin in this browser. No server/account synchronization is implied. */
export function createBrowserSettingsApi({
  key = "beamline-profile-sample-v1",
  initialValues = PERSONAL_SETTINGS_VALUES,
} = {}) {
  return {
    read: async (): Promise<SettingsValues> => {
      const stored = localStorage.getItem(key);
      if (!stored) return structuredClone(initialValues);
      const value = JSON.parse(stored) as SettingsValues;
      if (
        !value ||
        typeof value.name !== "string" ||
        typeof value.email !== "string" ||
        typeof value.timeZone !== "string" ||
        !value.notifications
      ) {
        throw new Error("The saved sample could not be read. Restore its browser storage, then try again.");
      }
      return value;
    },
    onSave: async (values: SettingsValues) => {
      if (!values.name.trim()) throw Object.assign(new Error("Enter your name."), { field: "name" });
      if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(values.email.trim()))
        throw Object.assign(new Error("Enter a full email address."), { field: "email" });
      try {
        localStorage.setItem(key, JSON.stringify(values));
      } catch {
        throw new Error(
          "This browser could not save the profile. Keep this tab open, restore storage access, then try again.",
        );
      }
    },
  };
}
