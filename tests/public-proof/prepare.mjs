// REASON: install the public sample through its no-account customer command in a genuinely fresh app.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.dirname(new URL(import.meta.url).pathname);
const framework = process.argv[2];
if (!["vite", "next"].includes(framework))
  throw new Error("Usage: node prepare.mjs vite|next");
const work = path.join(root, ".work");
const app = path.join(work, framework);
const out = path.join(root, "results", framework);
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(out, { recursive: true });
if (fs.existsSync(app))
  throw new Error(
    `Fresh-app directory already exists: ${app}; remove only that generated directory before rerunning.`,
  );
const commands = [];
const run = (cmd, args, cwd = app) => {
  const line = `${cmd} ${args.join(" ")}`;
  commands.push({ cwd: path.relative(root, cwd), command: line });
  console.log(line);
  try {
    const output = execFileSync(cmd, args, {
      cwd,
      encoding: "utf8",
      timeout: 900000,
      maxBuffer: 32 << 20,
      env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1" },
    });
    fs.appendFileSync(
      path.join(out, "install-build.log"),
      `$ ${line}\n${output}\n`,
    );
  } catch (e) {
    fs.appendFileSync(
      path.join(out, "install-build.log"),
      `$ ${line}\n${e.stdout || ""}\n${e.stderr || ""}`,
    );
    throw new Error(`${line} failed (see install-build.log)`);
  }
};
const write = (file, data) => {
  fs.mkdirSync(path.dirname(path.join(app, file)), { recursive: true });
  fs.writeFileSync(path.join(app, file), data);
};
let passed = false;
try {
  if (framework === "next") {
    run(
      "npx",
      [
        "--yes",
        "create-next-app@latest",
        "next",
        "--ts",
        "--tailwind",
        "--app",
        "--use-npm",
        "--src-dir",
        "--import-alias",
        "@/*",
        "--yes",
      ],
      work,
    );
    // The sample's layered CSS Modules use composition. Next's Webpack pipeline supports this; Turbopack does not.
    run("npm", ["install", "-D", "@tailwindcss/postcss"]);
    write(
      "postcss.config.mjs",
      'export default { plugins: { "@tailwindcss/postcss": {} } };\n',
    );
    // The proof tests installed UI, not Google's font network. Use the look's packaged fonts.
    write(
      "src/app/layout.tsx",
      'import "./globals.css"; export const metadata = { title: "Beamline free sample proof" }; export default function Layout({children}: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }\n',
    );
    write(
      "src/app/page.tsx",
      'import ProofApp from "../proof-app"; export default ProofApp;\n',
    );
    write(
      "src/app/globals.css",
      '@import "tailwindcss";\nbody { margin: 0; }\n',
    );
  } else {
    run(
      "npx",
      [
        "--yes",
        "create-vite@latest",
        "vite",
        "--template",
        "react-ts",
        "--no-interactive",
      ],
      work,
    );
    run("npm", ["install"]);
    run("npm", ["install", "-D", "tailwindcss", "@tailwindcss/vite"]);
    write(
      "vite.config.ts",
      'import { defineConfig } from "vite"; import react from "@vitejs/plugin-react"; import tailwindcss from "@tailwindcss/vite"; import { fileURLToPath } from "node:url"; export default defineConfig({plugins:[react(),tailwindcss()],resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}}});\n',
    );
    const ts = JSON.parse(
      fs
        .readFileSync(path.join(app, "tsconfig.app.json"), "utf8")
        .replace(/\/\*[^]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, ""),
    );
    ts.compilerOptions.paths = { "@/*": ["./src/*"] };
    write("tsconfig.app.json", JSON.stringify(ts, null, 2));
    write("src/index.css", '@import "tailwindcss";\nbody { margin: 0; }\n');
    write(
      "src/main.tsx",
      'import { createRoot } from "react-dom/client"; import ProofApp from "./proof-app"; import "./index.css"; createRoot(document.getElementById("root")!).render(<ProofApp/>);\n',
    );
  }
  write(
    "components.json",
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "new-york",
        rsc: framework === "next",
        tsx: true,
        tailwind: {
          config: "",
          css: framework === "next" ? "src/app/globals.css" : "src/index.css",
          baseColor: "neutral",
          cssVariables: true,
        },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
          lib: "@/lib",
          hooks: "@/hooks",
        },
      },
      null,
      2,
    ),
  );
  // Same public no-account registry path as the site's Code tab; --yes only accepts noninteractive installation.
  run("npx", [
    "--yes",
    "shadcn@latest",
    "add",
    "https://beamline.io/registry/settings.json",
    "--yes",
  ]);
  write("src/proof-app.tsx", fs.readFileSync(path.join(root, "app.tsx")));
  if (framework === "next") run("npx", ["next", "typegen"]);
  run("npx", [
    "tsc",
    "--noEmit",
    ...(framework === "vite" ? ["-p", "tsconfig.app.json"] : []),
  ]);
  run("npm", [
    "run",
    "build",
    ...(framework === "next" ? ["--", "--webpack"] : []),
  ]);
  passed = true;
} finally {
  const pkg = fs.existsSync(path.join(app, "package.json"))
    ? JSON.parse(fs.readFileSync(path.join(app, "package.json")))
    : {};
  const hashes = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, e.name);
      if (e.isDirectory()) walk(file);
      else
        hashes.push({
          file: path.relative(app, file),
          sha256: createHash("sha256")
            .update(fs.readFileSync(file))
            .digest("hex"),
        });
    }
  };
  walk(path.join(app, "src/ui/beamline"));
  fs.writeFileSync(
    path.join(out, "environment.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        framework,
        passed,
        revision: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: root,
          encoding: "utf8",
        }).trim(),
        changedCode: execFileSync(
          "git",
          [
            "diff",
            "HEAD",
            "--",
            "tests/public-proof",
            ".github/workflows/public-proof.yml",
          ],
          { cwd: root, encoding: "utf8" },
        ),
        node: process.version,
        os: `${os.type()} ${os.release()} ${os.arch()}`,
        dependencies: pkg.dependencies,
        commands,
        installedSource: hashes,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(out, "README.md"),
    `# Public sample proof: ${framework}\n\nDate: ${new Date().toISOString()}. Fresh app, no Beamline account/key. ${passed ? "Typecheck and production build passed." : "Preparation failed; see install-build.log."}\n\nThis installs the currently published free Settings source from beamline.io, not the dated ui/ snapshot in this repository. Exact installed source hashes, resolved app dependencies, revision/changed code and commands are in environment.json. Browser checks add their own JSON and screenshots.\n\nRerun from the repository: npm ci --prefix tests/public-proof; node tests/public-proof/prepare.mjs ${framework}; node tests/public-proof/run.mjs ${framework} playwright\n\nExpected: three routes fit the viewport and pass axe; profile save survives reload; dialog closes and focus returns. Simulator screenshots alone do not prove interactions, accessibility or a real iPhone.\n`,
  );
}
