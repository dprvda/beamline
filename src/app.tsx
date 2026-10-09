import { useEffect, useState } from "react";
import { Badge } from "@/components/badge/badge";
import { Settings, type SettingsValues } from "@/blocks/settings/settings";
import { createBrowserSettingsApi } from "@/demo/settings-fixtures";

/** The free sample's whole screen: profile and settings, saving to this browser's storage (demo data). */
export function App() {
  const [api] = useState(() => createBrowserSettingsApi());
  const [values, setValues] = useState<SettingsValues | null>(null);
  useEffect(() => {
    void api.read().then(setValues);
  }, [api]);
  if (!values) return <p style={{ padding: 32 }}>Loading profile…</p>;
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
      <Settings
        defaultValues={values}
        onSave={api.onSave}
        navigation="tabs"
        heading="Profile & settings"
        headingAside={<Badge size="sm">Saves stay in this browser</Badge>}
      />
    </main>
  );
}
