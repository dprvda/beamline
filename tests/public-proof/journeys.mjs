// REASON: the same public sample journeys drive Playwright and Apple's actual Safari WebDriver.
export const routes = ["profile", "workspace", "notifications"];
export async function journey(d, base, screenshot, audit) {
  const observations = [];
  const check = (name, observed, expected = true) => {
    observations.push({
      name,
      expected,
      observed,
      passed: JSON.stringify(observed) === JSON.stringify(expected),
    });
    if (!observations.at(-1).passed)
      throw new Error(
        `${name}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(observed)}`,
      );
  };
  await d.goto(base);
  await d.evaluate(() => localStorage.removeItem("beamline-public-proof"));
  await d.goto(`${base}/#profile`);
  await d.wait('input[autocomplete="name"]');
  for (const route of routes) {
    await d.click(`[data-proof-route="${route}"]`);
    await d.until(
      () =>
        document.querySelector('[data-slot="settings-section-heading"]')
          ?.textContent?.length > 0,
    );
    await d.settle();
    check(
      `${route}: heading`,
      await d.evaluate(
        () =>
          document.querySelector('[data-slot="settings-section-heading"]')
            ?.textContent,
      ),
      {
        profile: "Profile",
        workspace: "Workspace",
        notifications: "Notifications",
      }[route],
    );
    const size = await d.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    check(`${route}: no horizontal overflow`, size.scroll <= size.viewport);
    await screenshot(route);
    if (audit) check(`${route}: axe violations`, await audit(route), []);
  }
  await d.click('[data-proof-route="profile"]');
  await d.wait('input[autocomplete="name"]');
  await d.fill('input[autocomplete="name"]', "Alex Saved");
  await d.click('[data-action="save-settings"]');
  await d.until(
    () =>
      JSON.parse(localStorage.getItem("beamline-public-proof") || "{}").name ===
      "Alex Saved",
  );
  await screenshot("saved");
  await d.goto(`${base}/#profile`);
  await d.wait('input[autocomplete="name"]');
  check(
    "save survives reload",
    await d.evaluate(
      () => document.querySelector('input[autocomplete="name"]').value,
    ),
    "Alex Saved",
  );
  await d.click('[data-proof="open-dialog"]');
  await d.wait('[role="dialog"]');
  await d.settle();
  await screenshot("dialog");
  if (audit) check("dialog: axe violations", await audit("dialog"), []);
  await d.escape();
  await d.until(() => !document.querySelector('[role="dialog"]'));
  await d.until(() => document.activeElement?.getAttribute("data-proof") === "open-dialog");
  check(
    "dialog returns focus",
    await d.evaluate(() => document.activeElement?.getAttribute("data-proof")),
    "open-dialog",
  );
  return observations;
}
