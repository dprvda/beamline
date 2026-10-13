"use client";

import { useEffect, useState } from "react";
import { UIRoot } from "./ui/beamline/runtime/appearance";
import { prism } from "./ui/beamline/looks/prism";
import {
  Settings,
  type SettingsSection,
  type SettingsValues,
} from "./ui/beamline/blocks/settings/settings";
import { Button } from "./ui/beamline/components/button/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./ui/beamline/components/dialog/dialog";

// Public sample data and an app-owned save handler; no Beamline component code is copied into this fixture.
const initial: SettingsValues = {
  name: "Alex Sample",
  email: "alex@example.com",
  timeZone: "Europe/London",
  workspace: "Sample team",
  slug: "sample-team",
  notifications: { digest: true, mentions: false },
};
const routes = ["profile", "workspace", "notifications"] as const;
const storageKey = "beamline-public-proof";

export default function ProofApp() {
  const [values, setValues] = useState<SettingsValues | null>(null);
  const [section, setSection] = useState<SettingsSection>("profile");
  useEffect(() => {
    setValues(
      JSON.parse(localStorage.getItem(storageKey) || "null") || initial,
    );
    const change = () => {
      const hash = location.hash.slice(1);
      setSection(
        routes.includes(hash as (typeof routes)[number])
          ? (hash as SettingsSection)
          : "profile",
      );
    };
    change();
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  return (
    <UIRoot
      preset={prism}
      theme="dark"
      className="look-page"
      style={{ minHeight: "100dvh" }}
    >
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <h1>Free sample proof</h1>
        <p>Demo data. Saves stay in this browser.</p>
        <nav
          aria-label="Sample routes"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            margin: "20px 0",
          }}
        >
          {routes.map((route) => (
            <a key={route} href={`#${route}`} data-proof-route={route}>
              {route}
            </a>
          ))}
        </nav>
        {values && (
          <Settings
            defaultValues={values}
            section={section}
            onSectionChange={setSection}
            navigation="none"
            onSave={async (next) => {
              localStorage.setItem(storageKey, JSON.stringify(next));
            }}
            notificationOptions={[
              {
                id: "digest",
                label: "Weekly digest",
                description: "A weekly summary.",
              },
              {
                id: "mentions",
                label: "Mentions",
                description: "When someone mentions you.",
              },
            ]}
          />
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button data-proof="open-dialog" variant="outline">
              Open details
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Sample details"
            description="This dialog is part of the free sample."
          >
            <p>Close with Escape to return to the button.</p>
          </DialogContent>
        </Dialog>
      </main>
    </UIRoot>
  );
}
