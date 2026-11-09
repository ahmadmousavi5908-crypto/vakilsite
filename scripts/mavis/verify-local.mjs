import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const testFiles = readdirSync(resolve(root, "tests/mavis"))
  .filter((file) => file.endsWith(".test.mjs"))
  .sort()
  .map((file) => `tests/mavis/${file}`);

const lintTargets = [
  "src/lib/mavis",
  "src/app/api/mavis",
  "src/app/api/admin/mavis",
  "src/app/mavis/intake",
  "src/app/admin/mavis",
  "src/components/admin/MavisIntakeInbox.jsx",
  "src/components/admin/MavisKnowledgeSearch.jsx",
  "src/components/admin/MavisSearchConsolePanel.jsx",
  "src/components/public/MavisPublicIntakeForm.jsx",
  "scripts/mavis",
  ...testFiles,
];

const steps = [
  {
    label: "Generate the offline published article bundle",
    command: process.execPath,
    args: ["scripts/mavis/generate-offline-published-articles.mjs"],
  },
  {
    label: "Validate the canonical legal library",
    command: "python3",
    args: ["src/data/legal-library/validation/validate_library.py"],
  },
  {
    label: "Run all MAVIS Node.js tests",
    command: process.execPath,
    args: ["--test", ...testFiles],
  },
  {
    label: "Validate the legal source review queue against the canonical corpus",
    command: process.execPath,
    args: ["scripts/mavis/validate-legal-review-queue.mjs"],
  },
  {
    label: "Validate the offline knowledge bundle and provenance",
    command: process.execPath,
    args: ["scripts/mavis/validate-offline-bundle.mjs"],
  },
  {
    label: "Check offline application syntax",
    command: process.execPath,
    args: ["--check", "public/mavis-offline/app.js"],
  },
  {
    label: "Check offline search module syntax",
    command: process.execPath,
    args: ["--check", "public/mavis-offline/search.mjs"],
  },
  {
    label: "Check offline answer module syntax",
    command: process.execPath,
    args: ["--check", "public/mavis-offline/answer.mjs"],
  },
  {
    label: "Check offline service-worker syntax",
    command: process.execPath,
    args: ["--check", "public/mavis-offline/sw.js"],
  },
  {
    label: "Lint MAVIS routes, components, libraries and tests",
    command: "npm",
    args: ["run", "lint", "--", ...lintTargets],
  },
  {
    label: "Build the site with the repository's Webpack configuration",
    command: process.execPath,
    args: ["node_modules/next/dist/bin/next", "build", "--webpack"],
  },
];

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`);
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Could not start ${step.command}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Failed: ${step.label} (exit ${result.status ?? "unknown"})`);
    process.exit(result.status || 1);
  }
}

console.log("\nMAVIS local verification completed. Database pgTAP, staging, and real-device offline tests remain separate acceptance gates.");
