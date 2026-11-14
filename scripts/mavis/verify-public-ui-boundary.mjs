import { execFileSync } from "node:child_process";

const [baseRef, headRef] = process.argv.slice(2);

if (!baseRef || !headRef) {
  console.error("Usage: node scripts/mavis/verify-public-ui-boundary.mjs <base-ref> <head-ref>");
  process.exit(2);
}

const readAtRef = (ref, file) => execFileSync(
  "git",
  ["show", `${ref}:${file}`],
  { encoding: "utf8" }
);

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

const isAllowedMetadataRoute = (file) =>
  file === "src/app/sitemap.js";

const isAllowedAdminApiRoute = (file) =>
  file.startsWith("src/app/api/admin/mavis/search-console/");

const isAllowedPublicArticleLibrarySurface = (file) =>
  file === "src/app/articles/library/page.js" ||
  file === "src/app/articles/library/page.module.css";

function verifyPreservedArticleExtension(file) {
  const base = readAtRef(baseRef, file);
  const head = readAtRef(headRef, file);

  if (file === "src/app/articles/page.js") {
    const startMarker = "                {/* MAVIS_PUBLIC_ARTICLE_LIBRARY_LINK_START */}";
    const endMarker = "                {/* MAVIS_PUBLIC_ARTICLE_LIBRARY_LINK_END */}";
    const baseReturnIndex = base.indexOf("  return (");
    const headReturnIndex = head.indexOf("  return (");
    if (baseReturnIndex < 0 || headReturnIndex < 0) return false;

    let headReturn = head.slice(headReturnIndex);
    const start = headReturn.indexOf(startMarker);
    const end = headReturn.indexOf(endMarker, start);
    if (start < 0 || end < 0 || headReturn.indexOf(startMarker, start + 1) >= 0) return false;

    let afterMarker = end + endMarker.length;
    if (headReturn.slice(afterMarker, afterMarker + 2) === "\r\n") afterMarker += 2;
    else if (headReturn[afterMarker] === "\n") afterMarker += 1;

    headReturn = headReturn.slice(0, start) + headReturn.slice(afterMarker);
    return base.slice(baseReturnIndex) === headReturn;
  }

  if (file === "src/app/articles/[slug]/page.js") {
    const baseReturnIndex = base.indexOf("  return (");
    const headReturnIndex = head.indexOf("  return (");
    if (baseReturnIndex < 0 || headReturnIndex < 0) return false;
    return base.slice(baseReturnIndex) === head.slice(headReturnIndex);
  }

  if (file === "src/app/globals.css") {
    const allowedSuffix = `\n\n/* Public CMS article pagination */
.editorial-db-pagination{display:flex;justify-content:center;margin:22px 0 6px}
.editorial-db-pagination a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:9px 18px;background:#142b43;color:#fff;border:1px solid #b9955d;border-radius:3px;font-size:11px;font-weight:700;transition:background .2s ease,transform .2s ease}
.editorial-db-pagination a:hover{background:#24465a;transform:translateY(-1px)}
`;
    return head.startsWith(base) && head.slice(base.length) === allowedSuffix;
  }

  return false;
}

const articleExtensionFiles = new Set([
  "src/app/articles/page.js",
  "src/app/articles/[slug]/page.js",
  "src/app/globals.css",
]);

const failedArticleChecks = changedFiles.filter(
  (file) => articleExtensionFiles.has(file) && !verifyPreservedArticleExtension(file)
);

const protectedFiles = changedFiles.filter((file) => {
  if (isAllowedAdminSurface(file)) return false;
  if (isAllowedAdminApiRoute(file)) return false;
  if (isAllowedMetadataRoute(file)) return false;
  if (isAllowedPublicArticleLibrarySurface(file)) return false;
  if (articleExtensionFiles.has(file) && verifyPreservedArticleExtension(file)) return false;

  return (
    file.startsWith("src/app/") ||
    file.startsWith("src/components/") ||
    file.startsWith("src/styles/") ||
    file.startsWith("styles/") ||
    file.startsWith("public/")
  );
});

if (failedArticleChecks.length > 0) {
  console.error("Public article UI preservation failed. Static article markup or approved styles changed:");
  for (const file of failedArticleChecks) console.error(` - ${file}`);
}

if (protectedFiles.length > 0) {
  console.error("Protected public UI/assets changed. This PR must preserve the approved site presentation:");
  for (const file of protectedFiles) console.error(` - ${file}`);
  process.exit(1);
}

console.log(`Public UI preservation check passed. Reviewed ${changedFiles.length} changed files; static article markup is unchanged and CMS additions are isolated.`);
