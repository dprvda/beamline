# Rerun the public sample checks

Node 24 and npm, with network access to npm and beamline.io. No licence or account is used. From a fresh clone:

```sh
npm ci --prefix tests/public-proof
npx --prefix tests/public-proof playwright install --with-deps chromium firefox webkit
node tests/public-proof/prepare.mjs vite
node tests/public-proof/run.mjs vite playwright
node tests/public-proof/prepare.mjs next
node tests/public-proof/run.mjs next playwright
```

`prepare` creates fresh apps with `create-vite@latest` / `create-next-app@latest`, sets up Tailwind v4 and shadcn's `components.json`, and runs the site's no-account command `npx shadcn@latest add https://beamline.io/registry/settings.json --yes`. It then typechecks and builds. This tests the **current published free sample**, not this repository's dated `ui/` snapshot. Installed source SHA-256 values and dependencies identify the exact input even if the live registry changes. No Beamline component source is patched.

Each engine runs at 1512×982 and 390×844 with touch (Firefox does not support Playwright's `isMobile`; the touch/viewport are still applied). Three settings routes, save/reload, dialog/Escape/focus return, viewport overflow and axe WCAG A/AA plus best-practice rules are checked. This is partial automated accessibility evidence, not WCAG conformance. Saves use the fixture's localStorage handler, not a backend.

For macOS Safari (and, separately, an installed Xcode simulator):

```sh
sudo safaridriver --enable
node tests/public-proof/run.mjs vite safari
node tests/public-proof/run.mjs vite ios
```

Repeat with `next`. macOS checks use Apple's Safari WebDriver, not Playwright WebKit. The iOS job boots an available iPhone Simulator, opens each route in Mobile Safari and records `simctl` screenshots; it then attempts the same journeys through Safari's simulator WebDriver. The reports label the measured browser/device/version. A screenshot-only attempt is **not** an interaction pass. Safari on macOS is a separate normal job in the public workflow; its failure fails that workflow. iOS Simulator is **not yet qualified**: its route interaction failed on the GitHub runner, so it lives in the separate [manual-only workflow](../../.github/workflows/ios-qualification.yml) until it passes reliably. An iOS Simulator is not a real iPhone.

Results are under `tests/public-proof/results/<app>` (JSON, command logs, screenshots, README), uploaded on failures too. Fresh apps are under the ignored `.work/`; remove only that generated app folder before repeating its installation. Workflow triggers: push, Mondays, and Run workflow. You can fork this public repository and run it without configuring secrets.

Next.js setup: this source-mode check uses Next's supported `--webpack` build with Tailwind's PostCSS plugin. Next 16.4's default Turbopack pipeline does not support the sample's CSS Module composition inside cascade layers: its default Tailwind loader drops module styling; bypassing that loader produces a nested-`composes` build error. The initial failed public run retains that evidence. No installed component file is changed, and this check makes no Turbopack compatibility claim.
