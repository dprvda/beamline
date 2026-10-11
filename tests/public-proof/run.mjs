// REASON: retain real browser output and screenshots for public sample installation checks, without credentials.
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import { journey } from "./journeys.mjs";
const require = createRequire(import.meta.url);
const root = path.dirname(new URL(import.meta.url).pathname);
const [framework, mode = "playwright"] = process.argv.slice(2);
if (
  !["vite", "next"].includes(framework) ||
  !["playwright", "safari", "ios"].includes(mode)
)
  throw new Error("Usage: run.mjs vite|next playwright|safari|ios");
const app = path.join(root, ".work", framework),
  out = path.join(root, "results", framework);
fs.mkdirSync(out, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const port = probe.address().port;
    probe.close(() => resolve(port));
  });
});
const base = `http://127.0.0.1:${port}`;
const results = {
  date: new Date().toISOString(),
  framework,
  mode,
  expected:
    "Every route fits and passes axe; save persists; dialog returns focus.",
  runs: [],
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const serverLog = fs.openSync(path.join(out, `${mode}-server.log`), "w");
const server = spawn(
  "npm",
  [
    "run",
    framework === "next" ? "start" : "preview",
    "--",
    "--port",
    String(port),
    ...(framework === "vite"
      ? ["--host", "127.0.0.1", "--strictPort"]
      : ["--hostname", "127.0.0.1"]),
  ],
  { cwd: app, stdio: ["ignore", serverLog, serverLog], detached: true },
);
process.once("SIGTERM", () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
  process.exit(143);
});
async function ready() {
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null)
      throw new Error(`App server exited ${server.exitCode}`);
    if (
      await fetch(base).then(
        (r) => r.ok,
        () => false,
      )
    ) {
      await sleep(200);
      if (server.exitCode === null) return;
    }
    await sleep(500);
  }
  throw new Error("App server did not start");
}
const axe = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
async function audit(d, name, prefix) {
  await d.script(axe);
  const data = await d.script(
    'return await axe.run(document, {runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]}});',
    true,
  );
  fs.writeFileSync(
    path.join(out, `${prefix}-${name}-axe.json`),
    JSON.stringify(
      {
        url: data.url,
        testEngine: data.testEngine,
        passes: data.passes.map((x) => x.id),
        incomplete: data.incomplete,
        violations: data.violations,
      },
      null,
      2,
    ),
  );
  return data.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target),
  }));
}
async function withRun(label, viewport, open) {
  const run = { label, viewport, passed: false, observations: [] };
  results.runs.push(run);
  let d;
  try {
    d = await open();
    run.capabilities = d.capabilities;
    run.observations = await journey(
      d,
      base,
      (name) => d.screenshot(path.join(out, `${label}-${name}.png`)),
      (name) => audit(d, name, label),
    );
    run.viewport = await d.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      touch: navigator.maxTouchPoints,
      touchEvents: window.__proofTouches || 0,
    }));
    if (
      viewport &&
      (run.viewport.width !== viewport.width ||
        run.viewport.height !== viewport.height)
    )
      throw new Error(`Viewport mismatch: ${JSON.stringify(run.viewport)}`);
    if (viewport?.hasTouch && run.viewport.touchEvents < 1)
      throw new Error(
        "No native touch events were received in the requested touch context",
      );
    run.passed = true;
  } catch (e) {
    run.error = e.stack;
    if (d)
      await d
        .screenshot(path.join(out, `${label}-failure.png`))
        .catch(() => {});
  } finally {
    try {
      await d?.close();
    } catch (e) {
      run.passed = false;
      run.error = e.stack;
    }
  }
  console.log(
    `${run.passed ? "PASS" : "FAIL"} ${label}${run.error ? ": " + run.error.split("\n")[0] : ""}`,
  );
}
async function playwright() {
  const pw = await import("playwright");
  for (const engine of ["chromium", "firefox", "webkit"]) {
    const browser = await pw[engine].launch({ headless: true });
    try {
      for (const phone of [false, true]) {
        const viewport = phone
          ? { width: 390, height: 844, hasTouch: true }
          : { width: 1512, height: 982, hasTouch: false };
        await withRun(
          `${engine}-${phone ? "phone" : "desktop"}`,
          viewport,
          async () => {
            const context = await browser.newContext({
              viewport: { width: viewport.width, height: viewport.height },
              hasTouch: phone,
              ...(engine === "firefox" ? {} : { isMobile: phone }),
              colorScheme: "dark",
            });
            await context.addInitScript(() => {
              window.__proofTouches = 0;
              addEventListener(
                "touchstart",
                () => window.__proofTouches++,
                true,
              );
            });
            const page = await context.newPage();
            const errors = [];
            page.on("pageerror", (e) => errors.push(e.message));
            page.on("console", (m) => {
              if (m.type() === "error") errors.push(m.text());
            });
            return {
              capabilities: {
                browser: engine,
                version: browser.version(),
                platform: process.platform,
              },
              goto: (url) => page.goto(url),
              evaluate: (fn) => page.evaluate(fn),
              wait: (sel) => page.locator(sel).waitFor(),
              until: (fn, arg) => page.waitForFunction(fn, arg),
              click: (sel) =>
                phone ? page.locator(sel).tap() : page.locator(sel).click(),
              fill: (sel, value) => page.locator(sel).fill(value),
              escape: () => page.keyboard.press("Escape"),
              settle: () => page.waitForTimeout(350),
              screenshot: (file) =>
                page.screenshot({ path: file, fullPage: true }),
              script: (src, async) =>
                page.evaluate(
                  async ? `(async () => { ${src} })()` : `(() => { ${src} })()`,
                ),
              close: async () => {
                await context.close();
                if (errors.length)
                  throw new Error(`Browser errors: ${errors.join("; ")}`);
              },
            };
          },
        );
      }
    } finally {
      await browser.close();
    }
  }
}
async function safari() {
  const ios = mode === "ios";
  let device;
  if (ios) {
    const list = JSON.parse(
      execFileSync(
        "xcrun",
        ["simctl", "list", "devices", "available", "--json"],
        { encoding: "utf8" },
      ),
    );
    const candidates = Object.entries(list.devices)
      .filter(([runtime]) => runtime.includes("iOS"))
      .flatMap(([runtime, devices]) =>
        devices
          .filter((d) => d.name.startsWith("iPhone"))
          .map((d) => ({ ...d, runtime })),
      );
    device = candidates.at(-1);
    if (!device)
      throw new Error("No available iPhone Simulator runtime on runner");
    results.simulator = device;
    if (device.state !== "Booted")
      execFileSync("xcrun", ["simctl", "boot", device.udid], {
        timeout: 120000,
      });
    execFileSync("xcrun", ["simctl", "bootstatus", device.udid, "-b"], {
      timeout: 240000,
    });
    execFileSync("open", ["-a", "Simulator"]);
    // Screenshots from actual Mobile Safari are retained even if WebDriver session creation is unsupported.
    for (const route of ["profile", "workspace", "notifications"]) {
      execFileSync("xcrun", [
        "simctl",
        "openurl",
        device.udid,
        `${base}/#${route}`,
      ]);
      await sleep(4000);
      execFileSync("xcrun", [
        "simctl",
        "io",
        device.udid,
        "screenshot",
        path.join(out, `ios-simulator-${route}.png`),
      ]);
    }
  }
  const driverLog = fs.openSync(path.join(out, `${mode}-driver.log`), "w");
  const driver = spawn("/usr/bin/safaridriver", ["--port", "4444"], {
    stdio: ["ignore", driverLog, driverLog],
  });
  let id;
  const request = async (method, endpoint, body) => {
    const response = await fetch(`http://localhost:4444${endpoint}`, {
      method,
      headers: { "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(90000),
    });
    const data = await response.json();
    if (!response.ok || data.value?.error)
      throw new Error(JSON.stringify(data.value));
    return data.value;
  };
  const command = (method, endpoint, body) =>
    request(method, `/session/${id}${endpoint}`, body);
  const execute = (script, args = []) =>
    command("POST", "/execute/sync", { script, args });
  const element = async (sel) =>
    Object.values(
      await command("POST", "/element", { using: "css selector", value: sel }),
    )[0];
  try {
    for (let i = 0; i < 30; i++) {
      try {
        await request("GET", "/status");
        break;
      } catch {
        await sleep(500);
      }
    }
    await withRun(
      ios ? "ios-mobile-safari" : "safari-desktop",
      ios ? null : { width: 1512, height: 982 },
      async () => {
        const created = await request("POST", "/session", {
          capabilities: {
            alwaysMatch: {
              browserName: "safari",
              platformName: ios ? "iOS" : "mac",
              ...(ios
                ? {
                    "safari:useSimulator": true,
                    "safari:deviceUDID": device.udid,
                  }
                : {}),
            },
          },
        });
        id = created.sessionId;
        await command("POST", "/timeouts", {
          implicit: 15000,
          script: 60000,
          pageLoad: 60000,
        });
        if (!ios) {
          await command("POST", "/window/rect", {
            x: 0,
            y: 0,
            width: 1512,
            height: 1082,
          });
          const size = await execute(
            "return {w:innerWidth,h:innerHeight,ow:outerWidth,oh:outerHeight}",
          );
          await command("POST", "/window/rect", {
            width: 1512 + size.ow - size.w,
            height: 982 + size.oh - size.h,
          });
        }
        results.label = ios
          ? `iOS Simulator ${device.name}/${created.capabilities["safari:platformVersion"] || device.runtime}, Mobile Safari`
          : `Safari ${created.capabilities.browserVersion} on macOS (GitHub runner)`;
        return {
          capabilities: created.capabilities,
          goto: (url) => command("POST", "/url", { url }),
          evaluate: (fn) => execute(`return (${fn.toString()})()`),
          wait: (sel) => element(sel),
          until: async (fn, arg) => {
            for (let i = 0; i < 100; i++) {
              if (
                await execute(`return (${fn.toString()})(arguments[0])`, [arg])
              )
                return;
              await sleep(100);
            }
            throw new Error(`Condition timed out: ${fn}`);
          },
          click: async (sel) =>
            command("POST", `/element/${await element(sel)}/click`, {}),
          fill: async (sel, text) => {
            const e = await element(sel);
            await command("POST", `/element/${e}/clear`, {});
            await command("POST", `/element/${e}/value`, { text });
          },
          escape: async () => {
            const e = Object.values(await command("GET", "/element/active"))[0];
            await command("POST", `/element/${e}/value`, { text: "\uE00C" });
          },
          settle: () => sleep(350),
          screenshot: async (file) =>
            fs.writeFileSync(
              file,
              Buffer.from(await command("GET", "/screenshot"), "base64"),
            ),
          script: (src, async) =>
            async
              ? command("POST", "/execute/async", {
                  script: `const done=arguments[arguments.length-1]; (async()=>{${src}})().then(done,e=>done({error:String(e)}));`,
                  args: [],
                })
              : execute(src),
          close: async () => {
            if (id) await command("DELETE", "");
            id = null;
          },
        };
      },
    );
  } finally {
    if (id) await command("DELETE", "").catch(() => {});
    driver.kill();
    if (device && device.state !== "Booted")
      execFileSync("xcrun", ["simctl", "shutdown", device.udid]);
  }
}
try {
  await ready();
  if (mode === "playwright") await playwright();
  else await safari();
} catch (e) {
  results.error = e.stack;
  console.error(e.message);
} finally {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
  results.passed =
    !results.error &&
    results.runs.length > 0 &&
    results.runs.every((r) => r.passed);
  fs.writeFileSync(
    path.join(out, `${mode}.json`),
    JSON.stringify(results, null, 2),
  );
  fs.appendFileSync(
    path.join(out, "README.md"),
    `\n${results.label || mode}: ${results.passed ? "PASS" : "FAILED / UNVERIFIED"}. Details: ${mode}.json.\n`,
  );
  if (!results.passed) process.exitCode = 1;
}
