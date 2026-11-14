import { execFileSync } from "node:child_process";

const [baseRef, headRef] = process.argv.slice(2);

if (!baseRef || !headRef) {
  console.error("Usage: node scripts/mavis/verify-public-ui-boundary.mjs <base-ref> <head-ref>");
  process.exit(2);
}

const changedFiles = execFileSync(
  "git",
  ["diff", "--name-only", "--diff-filter=ACMRT", baseRef, headRef],
  { encoding: "utf8" }
)
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const isAllowedAdminSurface = (file) =>
  file.startsWith("src/app/admin/") ||
  file.startsWith("src/components/admin/");

const protectedFiles = changedFiles.filter((file) => {
  if (isAllowedAdminSurface(file)) return false;

  return (
    file.startsWith("src/app/") ||
    file.startsWith("src/components/") ||
    file.startsWith("src/styles/") ||
    file.startsWith("styles/") ||
    file.startsWith("public/")
  );
});

if (protectedFiles.length > 0) {
  console.error("Protected public UI/assets changed. This PR must preserve the approved site presentation:");
  for (const file of protectedFiles) console.error(` - ${file}`);
  process.exit(1);
}

console.log(`Public UI preservation check passed. Reviewed ${changedFiles.length} changed files; no protected public UI/assets were modified.`);
